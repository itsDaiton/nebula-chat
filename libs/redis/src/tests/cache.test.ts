import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLogger } from '@nebula-chat/otel';
import type { Logger } from '@nebula-chat/otel';
import { createCache } from '../cache';
import type { CacheConnection } from '../types';

type LogLine = Record<string, unknown> & { level: number; msg: string };

/** A real `@nebula-chat/otel` logger writing parsed lines to memory. */
const makeLogger = () => {
  const lines: LogLine[] = [];
  const logger = createLogger({
    serviceName: 'test',
    level: 'trace',
    destination: { write: (chunk: string) => lines.push(JSON.parse(chunk) as LogLine) },
  });
  return { logger, lines };
};

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
let lines: LogLine[];

beforeEach(() => {
  ({ logger, lines } = makeLogger());
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

  it('logs nothing on the happy path', async () => {
    const cache = createCache({ connection: makeConnection(), logger });

    await cache.set('k', 'v');
    await cache.get('k');
    await cache.get('missing');
    await cache.del('k');
    await cache.clear();

    expect(lines).toEqual([]);
  });

  describe('fail-open', () => {
    it('returns null instead of throwing when get fails, and warns once', async () => {
      const cache = createCache({ connection: brokenConnection(), logger });

      await expect(cache.get('conv:1')).resolves.toBeNull();
      expect(lines).toEqual([
        expect.objectContaining({
          level: 40,
          'event.name': 'cache.read.failed',
          'nebula.component': 'redis',
          'nebula.cache.key': 'conv:1',
          err: expect.objectContaining({ message: 'redis down', stack: expect.any(String) }),
        }),
      ]);
    });

    it('swallows a failing set and warns once', async () => {
      const cache = createCache({ connection: brokenConnection(), logger });

      await expect(cache.set('conv:1', 'v')).resolves.toBeUndefined();
      expect(lines).toEqual([
        expect.objectContaining({
          level: 40,
          'event.name': 'cache.write.failed',
          'nebula.component': 'redis',
          'nebula.cache.key': 'conv:1',
          err: expect.objectContaining({ message: 'redis down' }),
        }),
      ]);
    });

    it('swallows a failing del and warns once', async () => {
      const cache = createCache({ connection: brokenConnection(), logger });

      await expect(cache.del('conv:1')).resolves.toBeUndefined();
      expect(lines).toEqual([
        expect.objectContaining({
          level: 40,
          'event.name': 'cache.delete.failed',
          'nebula.component': 'redis',
          'nebula.cache.key': 'conv:1',
          err: expect.objectContaining({ message: 'redis down' }),
        }),
      ]);
    });

    it('swallows a failing clear and warns once with the pattern', async () => {
      const cache = createCache({ connection: brokenConnection(), logger });

      await expect(cache.clear('conv:*')).resolves.toBeUndefined();
      expect(lines).toEqual([
        expect.objectContaining({
          level: 40,
          'event.name': 'cache.clear.failed',
          'nebula.component': 'redis',
          'nebula.cache.pattern': 'conv:*',
          err: expect.objectContaining({ message: 'redis down' }),
        }),
      ]);
    });
  });
});
