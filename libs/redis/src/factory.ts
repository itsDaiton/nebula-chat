import type { Redis } from 'ioredis';
import { createConnectionManager } from './connection';
import { createCache } from './cache';
import type { RedisCache } from './cache';
import { createAuthStore } from './authStore';
import type { AuthStore } from './authStore';
import { createPubSub } from './pubsub';
import type { RedisPubSub } from './pubsub';
import type { RedisConfig } from './types';

/**
 * The namespaced Redis toolkit returned by `createRedis`. `cache`, `authStore`,
 * `pubsub` and the raw `connection` are built now; `streams` and `lock` remain
 * designed-for seams that land with their consuming tickets (M-7/M-8). `authStore`
 * is the first consumer of the reserved storage seam (M-6, better-auth); `pubsub`
 * carries runtime log-level changes (ADR-0020).
 */
export type RedisToolkit = {
  cache: RedisCache;
  /**
   * better-auth's `SecondaryStorage` over Redis — sessions, verification records
   * and rate-limit counters. NOT fail-open: Redis errors propagate (ADR-0010 §3).
   */
  authStore: AuthStore;
  /** Fire-and-forget broadcast to every subscribed process (ADR-0020). */
  pubsub: RedisPubSub;
  /** Raw ioredis instance, for libraries that need one (e.g. BullMQ in M-7). */
  connection: Redis;
  /**
   * Opens the connection now rather than on first use; resolves once it is ready,
   * or rejects if that attempt fails (ioredis keeps retrying). Call it at startup,
   * unawaited, so the first requests find Redis connected.
   */
  connect(): Promise<void>;
  /** Tears down every connection the toolkit owns. */
  close(): Promise<void>;
};

/**
 * The single entry point. Owns an internal connection manager and exposes
 * primitives over it; one `close()` tears everything down.
 */
export const createRedis = (config: RedisConfig): RedisToolkit => {
  const manager = createConnectionManager(config.redisUrl, config.logger);
  const cache = createCache({
    connection: manager.main,
    logger: config.logger,
    defaultTtlSeconds: config.cache?.defaultTtlSeconds,
  });
  const authStore = createAuthStore({ connection: manager.main, connect: manager.connect });
  const pubsub = createPubSub({
    publisher: manager.main,
    connect: manager.connect,
    subscriber: manager.subscriber,
  });

  return {
    cache,
    authStore,
    pubsub,
    connection: manager.main,
    connect: manager.connect,
    close: () => manager.close(),
  };
};
