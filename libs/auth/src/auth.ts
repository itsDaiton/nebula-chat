import { betterAuth } from 'better-auth';
import type { Auth, User as BetterAuthUser, Session as BetterAuthSession } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import {
  admin,
  anonymous,
  haveIBeenPwned,
  isPasswordCompromised,
  openAPI,
  twoFactor,
} from 'better-auth/plugins';
import {
  users,
  session,
  account,
  verification,
  twoFactor as twoFactorTable,
} from '@nebula-chat/db';
import { adminAc, defaultAc, userAc } from 'better-auth/plugins/admin/access';
import type { DbClient } from '@nebula-chat/db';
import type { AuthStore } from '@nebula-chat/redis';
import type { Logger } from '@nebula-chat/otel';
import { passwordResetEmail, verificationEmail } from './authEmails';
import { claimSessions } from './claim';
import { toBetterAuthLogHandler } from './logger';
import { markEmailVerified } from './markEmailVerified';
import {
  PASSWORD_REJECTION_MESSAGES,
  findChangePasswordRejection,
  findPasswordRejection,
} from './passwordRejection';
import type { ChangePasswordAttempt, PasswordRejection } from './passwordRejection';
import { DELETE_ACCOUNT_REJECTION_MESSAGES, findDeleteAccountRejection } from './deleteAccount';
import type { EmailSender } from './resend';
import { userDeletionHooks } from './userDeletion';
import { markTwoFactorVerifiedSession } from './twoFactorSession';
import type { OnUserDeleted } from './userDeletion';

/**
 * Everything the lib needs to build an instance; it never reads `process.env`, the server resolves these from its own env.
 * The Guest message allowance is enforced in the chat send pre-handler (ADR-0010 §4), not here.
 */
export type CreateAuthConfig = {
  /** The Drizzle client from `@nebula-chat/db` (better-auth owns the auth tables). */
  db: DbClient;
  /**
   * The Redis-backed `authStore` as better-auth's `SecondaryStorage`: sessions, verification records and rate-limit counters (ADR-0010 §3).
   */
  authStore: AuthStore;
  /**
   * Injected `@nebula-chat/otel` logger, the sink for better-auth's internal logs; the lib never touches `console`.
   */
  logger: Logger;
  /** `BETTER_AUTH_SECRET` — signs sessions and the session cookie cache. */
  secret: string;
  /** `BETTER_AUTH_URL` — the app's base URL, used for cookies/redirects. */
  baseURL: string;
  /** Origins allowed to call the auth endpoints (CSRF protection). */
  trustedOrigins?: string[];
  /** Delivers the verification and reset emails — Resend in production (ADR-0021). */
  sendEmail: EmailSender;
  /** Client page an OAuth callback that cannot reach its own `errorCallbackURL` redirects to. */
  errorURL?: string;
  /** OAuth apps for social sign-in; a provider left out is not offered (`PROVIDER_NOT_FOUND`). */
  socialProviders?: SocialProviderCredentials;
  /** Deletes what a deleted User kept outside Postgres, once the row is gone; a rejection is only logged. */
  onUserDeleted?: OnUserDeleted;
};

/** A provider's OAuth app; it redirects back to `${baseURL}/api/auth/callback/<provider>`. */
export type OAuthCredentials = {
  clientId: string;
  clientSecret: string;
};

/** The social sign-in providers Nebula Chat supports, each enabled by its credentials. */
export type SocialProviderCredentials = {
  google?: OAuthCredentials;
  github?: OAuthCredentials;
};

// The plugin's admin role minus `impersonate` (ADR-0027 §5), so no role can start an impersonation.
const adminWithoutImpersonation = defaultAc.newRole({
  user: adminAc.statements.user.filter((action) => action !== 'impersonate'),
  session: adminAc.statements.session,
});

/** The rejection as better-auth's own errors look: its code and message, with a 400. */
const toRejectionError = (rejection: PasswordRejection) =>
  APIError.from('BAD_REQUEST', {
    code: rejection,
    message: PASSWORD_REJECTION_MESSAGES[rejection],
  });

/**
 * Each provider with `overrideUserInfoOnSignIn` off: its profile image fills `image` when the user is
 * created and a later sign-in never refreshes it, so an uploaded Profile image sticks (NEB-473).
 */
const withProviderImageKept = (providers: SocialProviderCredentials) =>
  Object.fromEntries(
    Object.entries(providers).map(([provider, credentials]) => [
      provider,
      { ...credentials, overrideUserInfoOnSignIn: false },
    ]),
  );

/**
 * Builds the configured better-auth instance: Drizzle adapter over `@nebula-chat/db`, Redis `authStore` as secondary storage with rate limiting,
 * and the anonymous (Guest claim), Have I Been Pwned, OpenAPI, email/password, social and delete-user setup below.
 */
export const createAuth = ({
  db,
  authStore,
  logger,
  secret,
  baseURL,
  trustedOrigins,
  sendEmail,
  errorURL,
  socialProviders = {},
  onUserDeleted,
}: CreateAuthConfig): Auth =>
  // better-auth 1.7 made `Auth` generic and invariant, so the inferred instance no longer widens to the base `Auth` we expose;
  // cast back, which is safe since only the options generic differs.
  betterAuth({
    secret,
    baseURL,
    trustedOrigins,
    // Route better-auth's internal logs through the injected Pino logger.
    logger: {
      log: toBetterAuthLogHandler(logger),
    },
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { users, session, account, verification, twoFactor: twoFactorTable },
    }),
    user: {
      modelName: 'users',
      // Settings → Delete account: the password confirms it, or for a user without one a
      // sign-in under a day old. Their Sessions and messages go with them (FK cascades).
      deleteUser: {
        enabled: true,
        ...(onUserDeleted && userDeletionHooks(db, logger, onUserDeleted)),
      },
      additionalFields: {
        // Where our upload sits in storage; unset means `image` is a provider URL or empty.
        profileImageKey: { type: 'string', required: false, input: false, returned: false },
      },
    },
    advanced: {
      database: {
        generateId: 'uuid',
      },
      // Render keeps a client-sent X-Forwarded-For, so it is spoofable; Cloudflare's edge
      // sets CF-Connecting-IP itself, which keys the rate limiter per real client.
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] },
      // Fire-and-forget on a long-lived Node server; better-auth catches and logs a rejection.
      backgroundTasks: {
        handler: (promise) => {
          void promise;
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }) =>
        sendEmail(await passwordResetEmail({ user, url })),
      revokeSessionsOnPasswordReset: true,
      // The reset link was emailed to this address, so following it proves ownership.
      onPasswordReset: ({ user }) => markEmailVerified(db, user.id),
    },
    socialProviders: withProviderImageKept(socialProviders),
    account: {
      // A link never copies the provider's profile, so it can't replace an uploaded Profile image.
      accountLinking: { updateUserInfoOnLink: false },
    },
    // Without it, a callback with no usable OAuth state lands on better-auth's own error page.
    ...(errorURL && { onAPIError: { errorURL } }),
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) =>
        sendEmail(await verificationEmail({ user, url })),
    },
    // Adapts `authStore` to better-auth's SecondaryStorage (get/getAndDelete/increment/set/delete), with ttl in seconds.
    // `increment` sets its expiry only on create, the fixed window the rate limiter needs.
    hooks: {
      // Require the password on /delete-user, refuse an unchanged one on /change-password,
      // and a breached or unchanged one before /reset-password consumes the token.
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === '/delete-user') {
          const authSession = await getSessionFromCtx(ctx);
          // No session is better-auth's own 401.
          if (!authSession) return;
          const accounts = await ctx.context.internalAdapter.findAccounts(authSession.user.id);
          const rejection = findDeleteAccountRejection({
            password: (ctx.body as { password?: string } | undefined)?.password,
            hasPassword: accounts.some(({ providerId }) => providerId === 'credential'),
          });
          if (rejection) {
            throw APIError.from('BAD_REQUEST', {
              code: rejection,
              message: DELETE_ACCOUNT_REJECTION_MESSAGES[rejection],
            });
          }
          return;
        }
        if (ctx.path === '/change-password') {
          const rejection = findChangePasswordRejection(
            (ctx.body as ChangePasswordAttempt | undefined) ?? {},
          );
          if (rejection) throw toRejectionError(rejection);
          return;
        }
        if (ctx.path !== '/reset-password') return;
        const body = ctx.body as { token?: string; newPassword?: string } | undefined;
        const token = body?.token ?? (ctx.query?.['token'] as string | undefined);
        if (!token || !body?.newPassword) return;

        const { internalAdapter, password } = ctx.context;
        const rejection = await findPasswordRejection(
          { token, newPassword: body.newPassword },
          {
            findResetToken: async (resetToken) => {
              const record = await internalAdapter.findVerificationValue(
                `reset-password:${resetToken}`,
              );
              return record && { userId: record.value, expiresAt: record.expiresAt };
            },
            findPasswordHash: async (userId) =>
              (await internalAdapter.findAccounts(userId)).find(
                (linked) => linked.providerId === 'credential',
              )?.password ?? null,
            verifyPassword: (hash, candidate) => password.verify({ hash, password: candidate }),
            isPasswordCompromised,
          },
        );
        if (rejection) throw toRejectionError(rejection);
      }),
      after: createAuthMiddleware(markTwoFactorVerifiedSession),
    },
    secondaryStorage: {
      get: (key) => authStore.get(key),
      getAndDelete: (key) => authStore.getAndDelete(key),
      increment: (key, ttl) => authStore.increment(key, ttl),
      set: (key, value, ttl) => authStore.set(key, value, ttl),
      delete: (key) => authStore.delete(key),
    },
    session: {
      cookieCache: {
        enabled: true,
      },
      additionalFields: {
        // Set only by the after hook once a code is verified; the admin gate reads it (ADR-0027 §2).
        twoFactorVerified: { type: 'boolean', required: false, defaultValue: false, input: false },
      },
    },
    rateLimit: {
      enabled: true,
      storage: 'secondary-storage',
    },
    plugins: [
      anonymous({
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          // Claim the Guest's Sessions into the linked account BEFORE the
          // anonymous row is cleaned up (ADR-0010 §2).
          await claimSessions(db, {
            fromUserId: anonymousUser.user.id,
            toUserId: newUser.user.id,
          });
        },
      }),
      // /reset-password is breach-checked by the before hook, ahead of token consumption.
      haveIBeenPwned({ paths: ['/sign-up/email', '/change-password'] }),
      // Scalar UI at `/api/auth/reference` and the OpenAPI 3.1 schema at `/api/auth/open-api/generate-schema`,
      // reached through the server's `/api/auth/*` passthrough.
      openAPI(),
      // Impersonation stays off (ADR-0027 §5); the plugin's HTTP endpoints are blocked at the server's auth gate.
      admin({
        defaultRole: 'user',
        roles: { admin: adminWithoutImpersonation, user: userAc },
      }),
      // TOTP and backup codes only; a trusted device lasts better-auth's default 30 days.
      twoFactor({ issuer: 'Nebula Chat' }),
    ],
  }) as unknown as Auth;

/**
 * The instance type `createAuth` returns, annotated as the base `Auth` because the inferred type's plugin options aren't portable in `.d.ts` emit (TS2883).
 */
export type AuthInstance = Auth;

/**
 * The user record as the server sees it: better-auth's `User` plus the anonymous plugin's `isAnonymous`, which `requireRegistered` reads.
 */
export type User = BetterAuthUser & {
  /** `true` for a Guest (anonymous plugin); falsy/absent for a Registered user. */
  isAnonymous?: boolean | null;
  /** The admin plugin's role: `admin` or `user`. */
  role?: string | null;
  banned?: boolean | null;
  twoFactorEnabled?: boolean | null;
};

/** The session record as seen by the server. */
export type Session = BetterAuthSession & {
  /** Set once a second factor was verified on this auth session; a trusted-device or social sign-in leaves it false. */
  twoFactorVerified?: boolean | null;
};

/** `{ session, user }` — the shape `auth.api.getSession()` resolves to. */
export type SessionData = {
  session: Session;
  user: User;
};
