import { APIError, createAuthMiddleware } from 'better-auth/api';
import { deleteSessionCookie } from 'better-auth/cookies';
import type { BetterAuthPlugin } from 'better-auth';
import type { DbClient } from '@nebula-chat/db';
import {
  PENDING_DELETION_CODE,
  PENDING_DELETION_MESSAGES,
  findPendingUser,
  findPendingUserByEmail,
  purgeDateOf,
} from './pendingDeletion';

// The two-factor plugin's cookie, which lets a password sign-in skip the code challenge.
const TRUST_DEVICE_COOKIE = 'trust_device';

const isPasswordSignIn = (ctx: { path?: string }) => ctx.path === '/sign-in/email';

// The session hook lets a 2FA User's password sign-in through so the two-factor plugin can swap it for a code
// challenge; listed after that plugin, this keeps the challenge from being skipped for a User in Pending deletion.
export const pendingDeletionSignInPlugin = (db: DbClient): BetterAuthPlugin => ({
  id: 'pending-deletion-sign-in',
  hooks: {
    before: [
      {
        matcher: isPasswordSignIn,
        // Dropping the trusted-device cookie sends the User through the code, which answers the restore token.
        handler: createAuthMiddleware(async (ctx) => {
          const cookie = ctx.headers?.get('cookie');
          const email = (ctx.body as { email?: unknown } | undefined)?.email;
          const trustName = ctx.context.createAuthCookie(TRUST_DEVICE_COOKIE).name;
          if (!cookie?.includes(trustName) || typeof email !== 'string') return;
          if (!(await findPendingUserByEmail(db, email))?.twoFactorEnabled) return;
          const kept = cookie
            .split(';')
            .filter((pair) => pair.split('=')[0]!.trim() !== trustName)
            .join(';');
          return { context: { headers: new Headers({ cookie: kept }) } };
        }),
      },
    ],
    after: [
      {
        matcher: isPasswordSignIn,
        // Fails closed: a session that outlived the two-factor plugin never reaches a User in Pending deletion.
        handler: createAuthMiddleware(async (ctx) => {
          const signedIn = ctx.context.newSession;
          if (!signedIn) return;
          const pending = await findPendingUser(db, signedIn.user.id);
          if (!pending) return;
          await ctx.context.internalAdapter.deleteSession(signedIn.session.token);
          ctx.context.setNewSession(null);
          deleteSessionCookie(ctx);
          throw new APIError('FORBIDDEN', {
            code: PENDING_DELETION_CODE,
            message: PENDING_DELETION_MESSAGES[PENDING_DELETION_CODE],
            purgeDate: purgeDateOf(pending.pendingDeletionAt).toISOString(),
          });
        }),
      },
    ],
  },
});
