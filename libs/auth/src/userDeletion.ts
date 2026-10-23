import { eq } from 'drizzle-orm';
import { users } from '@nebula-chat/db';
import type { DbClient } from '@nebula-chat/db';
import { componentLogger, logEvent } from '@nebula-chat/otel';
import type { Logger } from '@nebula-chat/otel';

/** What of a deleted account lives outside Postgres, for the consumer to clean up. */
export type DeletedUser = {
  id: string;
  /** The uploaded Profile image's storage key; `null` for a provider image or none. */
  profileImageKey: string | null;
};

/** Runs once an account is deleted; a rejection is logged and never fails the delete. */
export type OnUserDeleted = (user: DeletedUser) => Promise<void>;

/**
 * better-auth's `user.deleteUser` hooks around a confirmed delete. Both run after the password or
 * fresh sign-in check, so a refused delete reaches neither. `beforeDelete` reads the key while the
 * row exists (the session's user never carries `profileImageKey`, which is `returned: false`);
 * `afterDelete` hands it on once the row is gone, so a failed row delete leaves the file in place.
 */
export const userDeletionHooks = (db: DbClient, logger: Logger, onUserDeleted: OnUserDeleted) => {
  const log = componentLogger(logger, 'auth');
  const deleting = new Map<string, DeletedUser>();

  return {
    beforeDelete: async ({ id }: { id: string }) => {
      const [row] = await db
        .select({ profileImageKey: users.profileImageKey })
        .from(users)
        .where(eq(users.id, id));
      deleting.set(id, { id, profileImageKey: row?.profileImageKey ?? null });
    },
    afterDelete: async ({ id }: { id: string }) => {
      const deleted = deleting.get(id);
      deleting.delete(id);
      if (!deleted) return;
      try {
        await onUserDeleted(deleted);
      } catch (err) {
        logEvent(
          log,
          'warn',
          'auth.user_cleanup.failed',
          { err, 'user.id': id },
          'Could not clean up after a deleted account',
        );
      }
    },
  };
};
