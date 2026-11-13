import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { bearer } from 'better-auth/plugins';

/** The only OAuth client the device flow serves: the `nebula` CLI (ADR-0029). */
export const CLI_CLIENT_ID = 'nebula-cli';

// Where a browser reviews a device code: reading it claims it, so all three are held to the same bar.
const REVIEW_PATHS = new Set(['/device', '/device/approve', '/device/deny']);

export const CLI_LOGIN_REFUSAL_MESSAGES = {
  ADMIN_REQUIRED: 'Only an Admin can approve a CLI sign-in.',
  TWO_FACTOR_REQUIRED:
    'Sign in with two-factor authentication on this device to approve a CLI sign-in.',
} as const;

export type CliLoginRefusal = keyof typeof CLI_LOGIN_REFUSAL_MESSAGES;

/** The plugin fields of an auth session's user and session that decide who may approve. */
export type CliLoginReviewer = {
  user: {
    isAnonymous?: boolean | null;
    emailVerified?: boolean | null;
    banned?: boolean | null;
    role?: string | null;
    twoFactorEnabled?: boolean | null;
  };
  session: { twoFactorVerified?: boolean | null };
};

/** Why this auth session may not review a device code: the admin gate's own conditions (ADR-0027 §2). */
export const findCliLoginRefusal = ({
  user,
  session,
}: CliLoginReviewer): CliLoginRefusal | null => {
  if (user.isAnonymous || !user.emailVerified || user.banned || user.role !== 'admin') {
    return 'ADMIN_REQUIRED';
  }
  if (!user.twoFactorEnabled || !session.twoFactorVerified) return 'TWO_FACTOR_REQUIRED';
  return null;
};

type HookContext = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];

const requireActingAdmin = async (ctx: HookContext) => {
  // Past the cookie cache, so a revoked role or a ban applies at once.
  const authSession = await getSessionFromCtx(ctx, { disableCookieCache: true });
  // Signed out is the plugin's own answer: a bare status for a read, a 401 for a decision.
  if (!authSession) return;
  // better-auth types the session without plugin fields.
  const refusal = findCliLoginRefusal(authSession as CliLoginReviewer);
  if (refusal) {
    throw APIError.from('FORBIDDEN', {
      code: refusal,
      message: CLI_LOGIN_REFUSAL_MESSAGES[refusal],
    });
  }
};

/** The slice of better-auth's after-hook context the marker reads. */
export type DeviceTokenHookContext = {
  context: {
    returned?: unknown;
    internalAdapter: {
      updateSession: (token: string, session: { twoFactorVerified: boolean }) => Promise<unknown>;
    };
  };
};

/**
 * The CLI's auth session inherits the second factor of the one that approved it: only a
 * 2FA-verified Admin can approve, and without the mark the admin gate would refuse the CLI.
 */
export const markDeviceSessionTwoFactorVerified = async ({
  context,
}: DeviceTokenHookContext): Promise<void> => {
  // A pending, denied or expired poll returns an APIError, which carries no token.
  const token = (context.returned as { access_token?: unknown } | null | undefined)?.access_token;
  if (typeof token !== 'string') return;
  await context.internalAdapter.updateSession(token, { twoFactorVerified: true });
};

/** The slice of better-auth's after-hook context the expiry reads. */
export type DeviceVerifyHookContext = {
  query?: unknown;
  json: (body: Record<string, unknown>) => unknown;
  context: {
    returned?: unknown;
    adapter: {
      findOne: <T>(query: {
        model: string;
        where: { field: string; value: string }[];
      }) => Promise<T | null>;
    };
  };
};

/** Adds `expires_at` to what the reviewing Admin reads, so the page can count the code down. */
export const addDeviceCodeExpiry = async ({ query, json, context }: DeviceVerifyHookContext) => {
  const returned = context.returned as { client_id?: unknown } | null | undefined;
  // Only the claiming reviewer is told the client; nobody else learns the expiry either.
  if (typeof returned?.client_id !== 'string') return;
  const typed = (query as { user_code?: unknown } | undefined)?.user_code;
  if (typeof typed !== 'string') return;
  const find = (value: string) =>
    context.adapter.findOne<{ expiresAt: Date }>({
      model: 'deviceCode',
      where: [{ field: 'userCode', value }],
    });
  // The plugin also matches a code typed with a dash or in lower case.
  const record =
    (await find(typed)) ?? (await find(typed.replace(/[^a-z0-9]/gi, '').toUpperCase()));
  if (!record) return;
  return json({ ...returned, expires_at: new Date(record.expiresAt).toISOString() });
};

// Listed after `deviceAuthorization()`, so its after hooks see what the plugin answered.
export const cliLoginPlugin = (): BetterAuthPlugin => ({
  id: 'cli-login',
  hooks: {
    before: [
      {
        matcher: ({ path }) => REVIEW_PATHS.has(path ?? ''),
        handler: createAuthMiddleware(requireActingAdmin),
      },
    ],
    after: [
      {
        matcher: ({ path }) => path === '/device/token',
        handler: createAuthMiddleware(markDeviceSessionTwoFactorVerified),
      },
      {
        matcher: ({ path }) => path === '/device',
        handler: createAuthMiddleware(addDeviceCodeExpiry),
      },
    ],
  },
});

// The only routes the CLI calls with its token: `whoami` and the admin gate read the auth session, `logout` ends it.
const BEARER_PATHS = new Set(['/get-session', '/sign-out']);

/**
 * better-auth's bearer plugin, held to the CLI's routes. Before hooks never see the auth session a
 * bearer token names, so anywhere else it would walk past every guard that reads one.
 */
export const cliBearerPlugin = (): BetterAuthPlugin => ({
  id: 'cli-bearer',
  hooks: {
    before: bearer().hooks.before.map(({ matcher, handler }) => ({
      matcher: (ctx) => BEARER_PATHS.has(ctx.path ?? '') && matcher(ctx),
      handler,
    })),
  },
});
