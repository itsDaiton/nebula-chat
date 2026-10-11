import { z } from 'zod';

/** One Supabase Storage setting; empty counts as unset, since `.env.example` ships them blank. */
export const storageSettingSchema = z.preprocess(
  (raw) => (raw === '' ? undefined : raw),
  z.string().min(1).optional(),
);

/** The Supabase Storage settings that together switch Profile image uploads on (ADR-0022). */
const PROFILE_IMAGE_STORAGE_ENV = [
  'SUPABASE_URL',
  'SUPABASE_SECRET_KEY',
  'PROFILE_IMAGE_BUCKET',
] as const;

type ProfileImageStorageEnv = Partial<
  Record<(typeof PROFILE_IMAGE_STORAGE_ENV)[number], string | undefined>
>;

/** Fails boot on some but not all of the storage settings: a half-configured store is a typo. */
export const checkProfileImageStorage = (ctx: z.core.ParsePayload<ProfileImageStorageEnv>) => {
  const set = PROFILE_IMAGE_STORAGE_ENV.filter((key) => ctx.value[key] !== undefined);
  if (set.length > 0 && set.length < PROFILE_IMAGE_STORAGE_ENV.length) {
    ctx.issues.push({
      code: 'custom',
      message: `Set all of ${PROFILE_IMAGE_STORAGE_ENV.join(', ')}, or none to switch Profile image uploads off`,
      input: ctx.value,
    });
  }
};
