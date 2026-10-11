import type { ProfileImageStore } from '@backend/modules/profileImage/profileImage.types';

/** The public URL the in-memory store hands out for a key. */
export const memoryProfileImageUrl = (key: string) => `https://storage.test/profile-images/${key}`;

/** An in-process stand-in for Supabase Storage: `files` is what the bucket would hold. */
export const memoryProfileImageStore = (): ProfileImageStore & { files: Map<string, Buffer> } => {
  const files = new Map<string, Buffer>();
  return {
    files,
    put: async (key, bytes) => {
      files.set(key, bytes);
      return memoryProfileImageUrl(key);
    },
    delete: async (key) => {
      files.delete(key);
    },
  };
};
