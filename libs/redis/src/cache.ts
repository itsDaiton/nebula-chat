import type { Logger } from '@nebula-chat/otel';
import type { CacheConnection } from './types';
import { recordCacheHit, recordCacheMiss } from './metrics';

/**
 * A single-tier Redis cache. Values are JSON-serialised. Every operation is
 * **fail-open**: a Redis error degrades a read to a miss and a write to a no-op,
 * logged through the injected logger and never thrown, so a cache outage can
 * never break the caller (per ADR-0009).
 */
export type RedisCache = {
  /** Returns the cached value, or `null` on a miss or any Redis error. */
  get<T>(key: string): Promise<T | null>;
  /** Writes a value with a TTL in seconds (falls back to the configured default). */
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  /** Removes a single key. */
  del(key: string): Promise<void>;
  /** Removes every key matching a glob pattern (default `*` — the whole keyspace). */
  clear(pattern?: string): Promise<void>;
};

type CreateCacheDeps = {
  connection: CacheConnection;
  logger: Logger;
  defaultTtlSeconds?: number;
};

export const createCache = ({
  connection,
  logger,
  defaultTtlSeconds = 600,
}: CreateCacheDeps): RedisCache => {
  const get = async <T>(key: string): Promise<T | null> => {
    try {
      const raw = await connection.get(key);
      if (raw === null) {
        recordCacheMiss();
        return null;
      }
      recordCacheHit();
      return JSON.parse(raw) as T;
    } catch (error) {
      logger.error({ err: error, key }, 'redis cache get failed (fail-open)');
      recordCacheMiss();
      return null;
    }
  };

  const set = async (
    key: string,
    value: unknown,
    ttlSeconds = defaultTtlSeconds,
  ): Promise<void> => {
    try {
      await connection.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      logger.error({ err: error, key }, 'redis cache set failed (fail-open)');
    }
  };

  const del = async (key: string): Promise<void> => {
    try {
      await connection.del(key);
    } catch (error) {
      logger.error({ err: error, key }, 'redis cache del failed (fail-open)');
    }
  };

  const clear = async (pattern = '*'): Promise<void> => {
    try {
      const keys = await connection.keys(pattern);
      if (keys.length > 0) {
        await connection.del(...keys);
      }
    } catch (error) {
      logger.error({ err: error, pattern }, 'redis cache clear failed (fail-open)');
    }
  };

  return { get, set, del, clear };
};
