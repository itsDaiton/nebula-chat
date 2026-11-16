import type { BetterAuthPlugin } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';

// better-auth's cookie names from its two-factor plugin, which it does not export.
const TWO_FACTOR_COOKIE_NAME = 'two_factor';
const TRUST_DEVICE_PATHS = new Set(['/two-factor/verify-totp', '/two-factor/verify-backup-code']);

// better-auth types its User without plugin fields, so `role` is read off a plain record.
type ChallengedUser = object | null;

/** The slice of better-auth's before-hook context the guard reads. */
export type TrustDeviceGuardContext = {
  path: string;
  body?: unknown;
  getSignedCookie: (name: string, secret: string) => Promise<string | null | false>;
  context: {
    secret: string;
    createAuthCookie: (name: string) => { name: string };
    internalAdapter: {
      findVerificationValue: (identifier: string) => Promise<{ value: string } | null>;
      findUserById: (id: string) => Promise<ChallengedUser>;
    };
  };
};

const isAdmin = (user: ChallengedUser) => (user as { role?: unknown } | null)?.role === 'admin';

/**
 * Admins cannot trust devices (ADR-0027 §2), so a sign-in challenge's verify drops `trustDevice` for them. The User
 * comes from the two-factor cookie; a signed-in caller has none, and better-auth ignores `trustDevice` for them anyway.
 */
export const dropAdminTrustDevice = async ({
  path,
  body,
  getSignedCookie,
  context,
}: TrustDeviceGuardContext): Promise<{ context: { body: object } } | undefined> => {
  if (!TRUST_DEVICE_PATHS.has(path)) return;
  const attempt = body as { trustDevice?: unknown } | undefined;
  if (!attempt?.trustDevice) return;
  const cookie = await getSignedCookie(
    context.createAuthCookie(TWO_FACTOR_COOKIE_NAME).name,
    context.secret,
  );
  if (!cookie) return;
  const challenge = await context.internalAdapter.findVerificationValue(cookie);
  if (!challenge) return;
  if (!isAdmin(await context.internalAdapter.findUserById(challenge.value))) return;
  return { context: { body: { ...attempt, trustDevice: false } } };
};

/** The slice of better-auth's after-hook context the flag reads. */
export type CanTrustDeviceContext = {
  path: string;
  body?: unknown;
  json: (body: Record<string, unknown>) => unknown;
  context: {
    returned?: unknown;
    internalAdapter: {
      findUserByEmail: (email: string) => Promise<{ user: ChallengedUser } | null>;
    };
  };
};

/** Adds `canTrustDevice` to a `/sign-in/email` two-factor challenge, so the client hides the checkbox for an Admin. */
export const flagCanTrustDevice = async ({ path, body, json, context }: CanTrustDeviceContext) => {
  if (path !== '/sign-in/email') return;
  const returned = context.returned as { twoFactorRedirect?: unknown } | null | undefined;
  if (returned?.twoFactorRedirect !== true) return;
  const email = (body as { email?: unknown } | undefined)?.email;
  if (typeof email !== 'string') return;
  const found = await context.internalAdapter.findUserByEmail(email);
  return json({ ...returned, canTrustDevice: !isAdmin(found?.user ?? null) });
};

// Listed after `twoFactor()`: plugin after hooks run in order, and only then is the challenge in `returned`.
export const adminTrustDevicePlugin = (): BetterAuthPlugin => ({
  id: 'admin-trust-device',
  hooks: {
    before: [
      {
        matcher: ({ path }) => TRUST_DEVICE_PATHS.has(path ?? ''),
        handler: createAuthMiddleware(dropAdminTrustDevice),
      },
    ],
    after: [
      {
        matcher: ({ path }) => path === '/sign-in/email',
        handler: createAuthMiddleware(flagCanTrustDevice),
      },
    ],
  },
});
