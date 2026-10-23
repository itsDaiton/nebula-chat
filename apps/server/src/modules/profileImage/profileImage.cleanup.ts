import type { OnUserDeleted } from '@nebula-chat/auth';
import type { EventLogger } from '@nebula-chat/otel';
import { logEvent } from '@nebula-chat/otel';
import type { ProfileImageStore } from '@backend/modules/profileImage/profileImage.types';

// Imports nothing that imports `@backend/auth`, so the auth singleton can use it without a cycle.

type CleanupLogger = EventLogger<'warn'>;

/** Deletes a file nothing points at any more; a failure leaves an orphan, never a failed request. */
export const deleteUnusedProfileImage = async (
  store: ProfileImageStore,
  key: string,
  log: CleanupLogger,
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

/**
 * The `onUserDeleted` callback: deletes a deleted account's uploaded Profile image. A provider
 * image has no key, and with uploads off there is no store, so neither asks storage anything.
 */
export const deleteProfileImageOfDeletedUser =
  (store: ProfileImageStore | null, log: CleanupLogger): OnUserDeleted =>
  async ({ id, profileImageKey }) => {
    if (!store || !profileImageKey) return;
    await deleteUnusedProfileImage(store, profileImageKey, log, id);
  };
