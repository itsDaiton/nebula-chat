import type { Redis } from 'ioredis'
import { createConnectionManager } from './connection'
import { createCache } from './cache'
import type { RedisCache } from './cache'
import { createAuthStore } from './authStore'
import type { AuthStore } from './authStore'
import type { RedisConfig } from './types'

/**
 * The namespaced Redis toolkit returned by `createRedis`. `cache`, `authStore`
 * and the raw `connection` are built now; `pubsub`, `streams` and `lock` remain
 * designed-for seams that land with their consuming tickets (M-7/M-8). `authStore`
 * is the first consumer of the reserved storage seam (M-6, better-auth).
 */
export interface RedisToolkit {
  cache: RedisCache
  /**
   * better-auth's `SecondaryStorage` over Redis — sessions, verification records
   * and rate-limit counters. NOT fail-open: Redis errors propagate (ADR-0010 §3).
   */
  authStore: AuthStore
  /** Raw ioredis instance, for libraries that need one (e.g. BullMQ in M-7). */
  connection: Redis
  /** Tears down every connection the toolkit owns. */
  close: () => Promise<void>
}

/**
 * The single entry point. Owns an internal connection manager and exposes
 * primitives over it; one `close()` tears everything down.
 */
export const createRedis = (config: RedisConfig): RedisToolkit => {
  const manager = createConnectionManager(config.redisUrl)
  const cache = createCache({
    connection: manager.main,
    logger: config.logger,
    defaultTtlSeconds: config.cache?.defaultTtlSeconds
  })
  const authStore = createAuthStore({ connection: manager.main })

  return {
    cache,
    authStore,
    connection: manager.main,
    close: async () => await manager.close()
  }
}
