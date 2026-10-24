import type { Redis } from 'ioredis';
import { createConnectionManager } from './connection';
import { createCache } from './cache';
import type { RedisCache } from './cache';
import { createAuthStore } from './authStore';
import type { AuthStore } from './authStore';
import { createPubSub } from './pubsub';
import type { RedisPubSub } from './pubsub';
import { createFlags } from './flags';
import type { RedisFlags } from './flags';
import { createStreams } from './streams';
import type { RedisStreams } from './streams';
import type { RedisConfig } from './types';

/**
 * The namespaced Redis toolkit returned by `createRedis`. `lock` remains a
 * designed-for seam that lands with its consuming ticket. `authStore` is the
 * first consumer of the reserved storage seam (M-6, better-auth); `pubsub`
 * carries runtime log-level changes (ADR-0020); `streams` carries reply streams
 * from the worker to the server (ADR-0014).
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
  /** Append-only per-key logs that readers tail from any offset (ADR-0014). */
  streams: RedisStreams;
  /** Short-lived markers raised with a TTL, such as a reply's cancel request (ADR-0014). */
  flags: RedisFlags;
  /** Raw ioredis instance: the main command connection. */
  connection: Redis;
  /**
   * A new connection of its own, for a library that blocks on one (BullMQ). It
   * has `maxRetriesPerRequest: null` and an offline queue; `close()` closes it.
   */
  dedicatedConnection(): Redis;
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

  const streams = createStreams({
    writer: manager.main,
    connect: manager.connect,
    readerConnection: manager.dedicated,
  });

  const flags = createFlags({ connection: manager.main, connect: manager.connect });

  return {
    cache,
    authStore,
    pubsub,
    streams,
    flags,
    connection: manager.main,
    dedicatedConnection: manager.dedicated,
    connect: manager.connect,
    close: () => manager.close(),
  };
};
