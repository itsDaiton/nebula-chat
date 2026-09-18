import type { Redis } from 'ioredis';
import { createConnectionManager } from './connection';
import { createCache } from './cache';
import type { RedisCache } from './cache';
import type { RedisConfig } from './types';

/**
 * The namespaced Redis toolkit returned by `createRedis`. `cache` and the raw
 * `connection` are built now; `pubsub`, `streams`, `rateLimit` and `lock` are
 * designed-for seams that land with their consuming tickets (M-6/M-7/M-8).
 */
export type RedisToolkit = {
  cache: RedisCache;
  /** Raw ioredis instance, for libraries that need one (e.g. BullMQ in M-7). */
  connection: Redis;
  /** Tears down every connection the toolkit owns. */
  close(): Promise<void>;
};

/**
 * The single entry point. Owns an internal connection manager and exposes
 * primitives over it; one `close()` tears everything down.
 */
export const createRedis = (config: RedisConfig): RedisToolkit => {
  const manager = createConnectionManager(config.redisUrl);
  const cache = createCache({
    connection: manager.main,
    logger: config.logger,
    defaultTtlSeconds: config.cache?.defaultTtlSeconds,
  });

  return {
    cache,
    connection: manager.main,
    close: () => manager.close(),
  };
};
