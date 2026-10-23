import { randomUUID } from 'node:crypto';
import { NotFoundError } from '@nebula-chat/errors';
import type { EventLogger } from '@nebula-chat/otel';
import { logEvent } from '@nebula-chat/otel';
import { deleteUnusedProfileImage } from '@backend/modules/profileImage/profileImage.cleanup';
import { toProfileImage } from '@backend/modules/profileImage/profileImage.processing';
import { profileImageRepository } from '@backend/modules/profileImage/profileImage.repository';
import type {
  ProfileImageDTO,
  ProfileImageSettingsDTO,
  ProfileImageStore,
} from '@backend/modules/profileImage/profileImage.types';
import { profileImageStore } from '@backend/profileImageStore';

type ServiceLogger = EventLogger<'warn'>;

/** What an upload gets while uploads are switched off. */
export const uploadsOffError = () => new NotFoundError('Profile image storage');

const requireStore = (): ProfileImageStore => {
  if (!profileImageStore) {
    throw uploadsOffError();
  }
  return profileImageStore;
};

export const profileImageService = {
  settings(): ProfileImageSettingsDTO {
    return { uploadsEnabled: profileImageStore !== null };
  },

  /**
   * Processes and stores the upload, points the user at it, then deletes their previous upload.
   * Saving the user before deleting means a failure never leaves them pointing at a missing file.
   */
  async upload(
    userId: string,
    bytes: Buffer | undefined,
    log: ServiceLogger,
  ): Promise<ProfileImageDTO> {
    const store = requireStore();
    const webp = await toProfileImage(bytes);
    const previous = await profileImageRepository.find(userId);

    const key = `${userId}/${randomUUID()}.webp`;
    const image = await store.put(key, webp);
    try {
      await profileImageRepository.save(userId, { image, key });
    } catch (err) {
      await deleteUnusedProfileImage(store, key, log);
      throw err;
    }

    if (previous?.key) {
      await deleteUnusedProfileImage(store, previous.key, log);
    }
    return { image };
  },

  /**
   * Clears the user's Profile image, then deletes its file when it was our upload. A provider's
   * Profile image has no key and no file, so the store is never asked about it.
   */
  async remove(userId: string, log: ServiceLogger): Promise<void> {
    const previous = await profileImageRepository.find(userId);
    if (!previous?.image && !previous?.key) return;

    await profileImageRepository.save(userId, { image: null, key: null });
    if (!previous.key) return;

    if (profileImageStore) {
      await deleteUnusedProfileImage(profileImageStore, previous.key, log);
    } else {
      logEvent(
        log,
        'warn',
        'profile_image.orphaned',
        { 'nebula.profile_image.key': previous.key },
        'No Profile image storage is configured to delete the removed file from',
      );
    }
  },
};
