import { createAuth } from '@nebula-chat/auth';
import type { AuthInstance } from '@nebula-chat/auth';
import { db } from '@backend/db';
import { env } from '@backend/env';
import { logger } from '@backend/logger';
import { redis } from '@backend/redis';

/**
 * The server's single configured better-auth instance, mirroring `src/db.ts` and
 * `src/redis.ts`. Config lives here — consumers import `auth` from `@backend/auth`
 * rather than constructing their own. The lib (`@nebula-chat/auth`) owns the
 * better-auth configuration; the server only injects its resolved env, the DB
 * client, and the Redis-backed `authStore` (ADR-0010).
 */
export const auth: AuthInstance = createAuth({
  db,
  authStore: redis.authStore,
  logger,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.CLIENT_URL],
});
