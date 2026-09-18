import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Logger } from '@nebula-chat/otel';
import { createCache } from '../cache';
import type { CacheConnection } from '../types';

const makeLogger = () =>
  ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }) as unknown as Logger;

type FakeConnection = CacheConnection & { store: Map<string, string> };

const makeConnection = (): FakeConnection => {
  const store = new Map<string, string>();
  return {
    store,
    get: (async (key: string) => store.get(key) ?? null) as CacheConnection['get'],
    set: async (key: string, value: string) => {
      store.set(key, value);
      return 'OK';
    },
    del: (async (...keys: string[]) => {
      let removed = 0;
      for (const key of keys) if (store.delete(key)) removed++;
      return removed;
    }) as CacheConnection['del'],
    keys: (async (pattern: string) => {
      const all = [...store.keys()];
      if (pattern === '*') return all;
      const prefix = pattern.replace(/\*$/, '');
      return all.filter((k) => k.startsWith(prefix));
    }) as CacheConnection['keys'],
  };
};

// A connection whose every command rejects — stands in for Redis being down.
const brokenConnection = (): CacheConnection => {
  const boom = () => Promise.reject(new Error('redis down'));
  return {
    get: boom as CacheConnection['get'],
    set: boom as unknown as CacheConnection['set'],
    del: boom as CacheConnection['del'],
    keys: boom as CacheConnection['keys'],
  };
};

let logger: Logger;

beforeEach(() => {
  logger = makeLogger();
});

describe('createCache', () => {
  it('round-trips a value through set and get', async () => {
    const cache = createCache({ connection: makeConnection(), logger });

    await cache.set('user:1', { name: 'Ada', roles: ['admin'] });

    expect(await cache.get('user:1')).toEqual({ name: 'Ada', roles: ['admin'] });
  });

  it('returns null for a key that was never set', async () => {
    const cache = createCache({ connection: makeConnection(), logger });

    expect(await cache.get('missing')).toBeNull();
  });

  it('honours a per-call TTL over the default', async () => {
    const connection = makeConnection();
    const spy = vi.spyOn(connection, 'set');
    const cache = createCache({ connection, logger, defaultTtlSeconds: 600 });

    await cache.set('k', 'v', 42);

    expect(spy).toHaveBeenCalledWith('k', JSON.stringify('v'), 'EX', 42);
  });

  it('applies the configured default TTL when none is given', async () => {
    const connection = makeConnection();
    const spy = vi.spyOn(connection, 'set');
    const cache = createCache({ connection, logger, defaultTtlSeconds: 120 });

    await cache.set('k', 'v');

    expect(spy).toHaveBeenCalledWith('k', JSON.stringify('v'), 'EX', 120);
  });

  it('removes a single key with del', async () => {
    const cache = createCache({ connection: makeConnection(), logger });
    await cache.set('gone', 1);

    await cache.del('gone');

    expect(await cache.get('gone')).toBeNull();
  });

  it('clear removes only keys matching the pattern', async () => {
    const connection = makeConnection();
    const cache = createCache({ connection, logger });
    await cache.set('conv:1', 'a');
    await cache.set('conv:2', 'b');
    await cache.set('user:1', 'c');

    await cache.clear('conv:*');

    expect(await cache.get('conv:1')).toBeNull();
    expect(await cache.get('conv:2')).toBeNull();
    expect(await cache.get('user:1')).toBe('c');
  });

  describe('fail-open', () => {
    it('returns null instead of throwing when get fails, and logs it', async () => {
      const cache = createCache({ connection: brokenConnection(), logger });

      await expect(cache.get('k')).resolves.toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });

    it('swallows a failing set', async () => {
      const cache = createCache({ connection: brokenConnection(), logger });

      await expect(cache.set('k', 'v')).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
    });

    it('swallows a failing del', async () => {
      const cache = createCache({ connection: brokenConnection(), logger });

      await expect(cache.del('k')).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
    });

    it('swallows a failing clear', async () => {
      const cache = createCache({ connection: brokenConnection(), logger });

      await expect(cache.clear()).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
