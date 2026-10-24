import type { z } from 'zod';
import type {
  profileImageSchema,
  profileImageSettingsSchema,
} from '@server/modules/profileImage/profileImage.validation';

/**
 * Where Profile image files live (ADR-0022): Supabase Storage in production, in memory in tests.
 * Keys are paths inside the store, `<userId>/<random>.webp`.
 */
export type ProfileImageStore = {
  /** Stores a processed WebP under `key` and returns its public URL. */
  put: (key: string, bytes: Buffer) => Promise<string>;
  delete: (key: string) => Promise<void>;
};

/** The Profile image fields of a better-auth user row; `profileImageKey` is our extra field. */
export type ProfileImageUserFields = {
  image?: string | null;
  profileImageKey?: string | null;
};

/** A user's Profile image columns: `key` is set only when `image` is our own upload. */
export type StoredProfileImage = {
  image: string | null;
  key: string | null;
};

export type ProfileImageDTO = z.infer<typeof profileImageSchema>;

export type ProfileImageSettingsDTO = z.infer<typeof profileImageSettingsSchema>;
