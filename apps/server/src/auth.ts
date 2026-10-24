import { createAuth, createResendEmailSender } from '@nebula-chat/auth';
import type { AuthInstance } from '@nebula-chat/auth';
import { db } from '@server/db';
import { env } from '@server/env';
import { logger } from '@server/logger';
import { deleteProfileImageOfDeletedUser } from '@server/modules/profileImage/profileImage.fileDeletion';
import { profileImageStore } from '@server/profileImageStore';
import { redis } from '@server/redis';
import { socialProvidersFromEnv } from '@server/utils/socialProviders';

/**
 * The server's single configured better-auth instance, mirroring `src/db.ts` and
 * `src/redis.ts`. Config lives here — consumers import `auth` from `@server/auth`
 * rather than constructing their own. The lib (`@nebula-chat/auth`) owns the
 * better-auth configuration; the server only injects its resolved env, the DB
 * client, the Redis-backed `authStore` (ADR-0010), the Resend sender (ADR-0021) and the
 * Profile image file deletion run on Account deletion (ADR-0022).
 */
export const auth: AuthInstance = createAuth({
  db,
  authStore: redis.authStore,
  logger,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.CLIENT_URL],
  sendEmail: createResendEmailSender({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM }),
  // A failed social sign-in lands on the client's auth page, which explains its `?error=`.
  errorURL: new URL('/auth', env.CLIENT_URL).href,
  socialProviders: socialProvidersFromEnv(env),
  // A deleted User's uploaded Profile image goes with them; a failed delete is only logged.
  onUserDeleted: deleteProfileImageOfDeletedUser(profileImageStore, logger),
});
