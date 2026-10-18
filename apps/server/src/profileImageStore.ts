import { createClient } from '@supabase/supabase-js';
import { env } from '@backend/env';
import { createSupabaseProfileImageStore } from '@backend/modules/profileImage/profileImage.supabaseStore';
import type { ProfileImageStore } from '@backend/modules/profileImage/profileImage.types';

const { SUPABASE_URL, SUPABASE_SECRET_KEY, PROFILE_IMAGE_BUCKET } = env;

/**
 * The server's Profile image store, mirroring `src/db.ts`. `null` when the Supabase settings
 * are unset: uploads are then switched off, while the rest of the app runs as usual (ADR-0022).
 */
export const profileImageStore: ProfileImageStore | null =
  SUPABASE_URL && SUPABASE_SECRET_KEY && PROFILE_IMAGE_BUCKET
    ? createSupabaseProfileImageStore({
        // A server-side client: no session to persist or refresh.
        client: createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        }),
        bucket: PROFILE_IMAGE_BUCKET,
      })
    : null;
