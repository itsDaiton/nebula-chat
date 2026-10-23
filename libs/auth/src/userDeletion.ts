import { eq } from 'drizzle-orm';
import { users } from '@nebula-chat/db';
import type { DbClient } from '@nebula-chat/db';
import { componentLogger, logEvent } from '@nebula-chat/otel';
import type { Logger } from '@nebula-chat/otel';

/** What of a deleted User lives outside Postgres, for the consumer to delete. */
export type DeletedUser = {
  id: string;
  /** The uploaded Profile image's storage key; `null` for a provider image or none. */
  profileImageKey: string | null;
};

/** Runs once a User is deleted; a rejection is logged and never fails the delete. */
export type OnUserDeleted = (user: DeletedUser) => Promise<void>;

/** better-auth's delete hooks, run only once the delete is confirmed: read the key, then hand it on. */
// The session's user never carries `profileImageKey` (`returned: false`), so it is read while the row exists.
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
          'auth.user_deleted_callback.failed',
          { err, 'user.id': id },
          'The onUserDeleted callback failed for a deleted User',
        );
      }
    },
  };
};
