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
 * The server's single better-auth instance: the lib owns the config, the server injects its env, DB, Redis `authStore`, email sender and cleanup callbacks.
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
