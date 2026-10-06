import { createAuth, createResendEmailSender } from '@nebula-chat/auth';
import type { AuthInstance } from '@nebula-chat/auth';
import { db } from '@backend/db';
import { env } from '@backend/env';
import { logger } from '@backend/logger';
import { redis } from '@backend/redis';
import { socialProvidersFromEnv } from '@backend/utils/socialProviders';

/**
 * The server's single configured better-auth instance, mirroring `src/db.ts` and
 * `src/redis.ts`. Config lives here — consumers import `auth` from `@backend/auth`
 * rather than constructing their own. The lib (`@nebula-chat/auth`) owns the
 * better-auth configuration; the server only injects its resolved env, the DB
 * client, the Redis-backed `authStore` (ADR-0010), the Resend sender (ADR-0021) and the
 * configured social sign-in providers.
 */
export const auth: AuthInstance = createAuth({
  db,
  authStore: redis.authStore,
  logger,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.CLIENT_URL],
  sendEmail: createResendEmailSender({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM }),
  socialProviders: socialProvidersFromEnv(env),
});
