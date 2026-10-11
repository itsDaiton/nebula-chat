import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProfileImageStore } from '@backend/modules/profileImage/profileImage.types';

type CreateSupabaseProfileImageStoreConfig = {
  client: Pick<SupabaseClient, 'storage'>;
  bucket: string;
};

// Every path is written once and never changes, so caches may keep a file for a year.
const CACHE_SECONDS = String(365 * 24 * 60 * 60);

/** Profile image files in a public Supabase Storage bucket, written with the secret key. */
export const createSupabaseProfileImageStore = ({
  client,
  bucket,
}: CreateSupabaseProfileImageStoreConfig): ProfileImageStore => {
  const files = () => client.storage.from(bucket);

  return {
    async put(key, bytes) {
      const { error } = await files().upload(key, bytes, {
        contentType: 'image/webp',
        cacheControl: CACHE_SECONDS,
        upsert: false,
      });
      if (error) throw error;
      return files().getPublicUrl(key).data.publicUrl;
    },
    async delete(key) {
      const { error } = await files().remove([key]);
      if (error) throw error;
    },
  };
};
