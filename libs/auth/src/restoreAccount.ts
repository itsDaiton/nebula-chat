import { APIError, createAuthEndpoint } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import type { BetterAuthPlugin } from 'better-auth';
import type { DbClient } from '@nebula-chat/db';
import { clearPendingDeletion, restoreTokenIdentifier } from './pendingDeletion';

// Trades a Pending-deletion sign-in's one-time token for a session; declining just lets it expire.
export const restoreAccountPlugin = (db: DbClient): BetterAuthPlugin => ({
  id: 'restore-account',
  endpoints: {
    restoreAccount: createAuthEndpoint('/restore-account', { method: 'POST' }, async (ctx) => {
      const { internalAdapter } = ctx.context;
      const token = (ctx.body as { token?: unknown } | undefined)?.token;
      // Consuming the record makes the token single-use.
      const record =
        typeof token === 'string' && token
          ? await internalAdapter.consumeVerificationValue(restoreTokenIdentifier(token))
          : null;
      const user =
        record && record.expiresAt.getTime() >= Date.now()
          ? await internalAdapter.findUserById(record.value)
          : null;
      if (!user) {
        throw APIError.from('BAD_REQUEST', {
          code: 'INVALID_RESTORE_TOKEN',
          message: 'This restore link is invalid or has expired. Sign in again.',
        });
      }
      await clearPendingDeletion(db, user.id);
      const session = await internalAdapter.createSession(user.id);
      await setSessionCookie(ctx, { session, user });
      return ctx.json({ success: true });
    }),
  },
});
