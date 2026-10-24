import { auth } from '@server/auth';
import type {
  ProfileImageUserFields,
  StoredProfileImage,
} from '@server/modules/profileImage/profileImage.types';

/**
 * Reads and writes go through better-auth's internal adapter, not Drizzle: its `updateUser`
 * also refreshes the copies of the user every active session keeps in Redis.
 */
export const profileImageRepository = {
  async find(userId: string): Promise<StoredProfileImage | null> {
    const { internalAdapter } = await auth.$context;
    const user = (await internalAdapter.findUserById(userId)) as ProfileImageUserFields | null;
    return user && { image: user.image ?? null, key: user.profileImageKey ?? null };
  },

  async save(userId: string, { image, key }: StoredProfileImage): Promise<void> {
    const { internalAdapter } = await auth.$context;
    await internalAdapter.updateUser(userId, { image, profileImageKey: key });
  },
};
