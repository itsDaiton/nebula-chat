import { componentLogger, logEvent } from '@nebula-chat/otel';
import type { Logger } from '@nebula-chat/otel';
import type { CacheConnection } from './types';
import { recordCacheHit, recordCacheMiss } from './metrics';

/**
 * A single-tier Redis cache. Values are JSON-serialised. Every operation is
 * **fail-open**: a Redis error degrades a read to a miss and a write to a no-op,
 * logged through the injected logger and never thrown, so a cache outage can
 * never break the caller (per ADR-0009). A failure is handled and the user is
 * unaffected, so it is a `warn` (`cache.*.failed`), not an `error`.
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
  const log = componentLogger(logger, 'redis');

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
      logEvent(
        log,
        'warn',
        'cache.read.failed',
        { err: error, 'nebula.cache.key': key },
        'Cache read failed; treating it as a miss',
      );
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
      logEvent(
        log,
        'warn',
        'cache.write.failed',
        { err: error, 'nebula.cache.key': key },
        'Cache write failed; continuing without caching',
      );
    }
  };

  const del = async (key: string): Promise<void> => {
    try {
      await connection.del(key);
    } catch (error) {
      logEvent(
        log,
        'warn',
        'cache.delete.failed',
        { err: error, 'nebula.cache.key': key },
        'Cache delete failed; the entry expires on its TTL',
      );
    }
  };

  const clear = async (pattern = '*'): Promise<void> => {
    try {
      const keys = await connection.keys(pattern);
      if (keys.length > 0) {
        await connection.del(...keys);
      }
    } catch (error) {
      logEvent(
        log,
        'warn',
        'cache.clear.failed',
        { err: error, 'nebula.cache.pattern': pattern },
        'Cache clear failed; matching entries expire on their TTL',
      );
    }
  };

  return { get, set, del, clear };
};
