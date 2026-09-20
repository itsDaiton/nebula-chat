import type { Redis } from 'ioredis'
import type { Logger } from '@nebula-chat/otel'

export interface CacheOptions {
  /** Default TTL in seconds applied by `set()` when no per-call TTL is given. Default: 600 (10 min). */
  defaultTtlSeconds?: number
}

export interface RedisConfig {
  /** Redis connection string */
  redisUrl: string
  /**
   * Injected `@nebula-chat/otel` logger. The lib logs exclusively through this —
   * it never reaches for `console` or a consumer's own logger.
   */
  logger: Logger
  cache?: CacheOptions
}

/**
 * The subset of the ioredis client the cache primitive actually calls. Narrowing
 * it here lets a test supply a plain fake without standing up a real server, and
 * a real `Redis` instance satisfies it structurally.
 */
export type CacheConnection = Pick<Redis, 'get' | 'del' | 'keys'> & {
  set: (key: string, value: string, expiryMode: 'EX', ttlSeconds: number) => Promise<unknown>
}

/**
 * The subset of the ioredis client the `authStore` primitive actually calls.
 * Like `CacheConnection`, narrowing it lets tests supply a plain fake while a real
 * `Redis` instance satisfies it structurally. `getdel` maps to Redis `GETDEL`,
 * `incr` to `INCR` and `expire` to `EXPIRE` (used together for TTL-on-create
 * counters); `set` carries both the plain and `EX`-with-TTL overloads
 * (better-auth passes the TTL in seconds).
 */
export type AuthStoreConnection = Pick<Redis, 'get' | 'del' | 'getdel' | 'incr' | 'expire'> & {
  set: ((key: string, value: string, expiryMode: 'EX', ttlSeconds: number) => Promise<unknown>) & ((key: string, value: string) => Promise<unknown>)
}
