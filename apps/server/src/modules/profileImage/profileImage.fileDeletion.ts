import type { OnUserDeleted } from '@nebula-chat/auth';
import type { EventLogger } from '@nebula-chat/otel';
import { logEvent } from '@nebula-chat/otel';
import type { ProfileImageStore } from '@server/modules/profileImage/profileImage.types';

// Imports nothing that imports `@server/auth`, so the auth singleton can use it without a cycle.

type FileDeletionLogger = EventLogger<'warn'>;

/** Deletes a file nothing points at any more; a failure leaves an orphan, never a failed request. */
export const deleteUnusedProfileImage = async (
  store: ProfileImageStore,
  key: string,
  log: FileDeletionLogger,
  userId?: string,
) => {
  try {
    await store.delete(key);
  } catch (err) {
    logEvent(
      log,
      'warn',
      'profile_image.delete.failed',
      { err, 'nebula.profile_image.key': key, 'user.id': userId },
      'Could not delete an unused Profile image file',
    );
  }
};

/** The `onUserDeleted` callback: deletes a deleted User's upload. No key (a provider image) or no store asks nothing. */
export const deleteProfileImageOfDeletedUser =
  (store: ProfileImageStore | null, log: FileDeletionLogger): OnUserDeleted =>
  async ({ id, profileImageKey }) => {
    if (!store || !profileImageKey) return;
    await deleteUnusedProfileImage(store, profileImageKey, log, id);
  };
