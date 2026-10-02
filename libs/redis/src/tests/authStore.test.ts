import { describe, it, expect, vi } from 'vitest';
import { createAuthStore } from '../authStore';
import type { AuthStore } from '../authStore';
import { createConnector } from '../connector';
import type { AuthStoreConnection, LazyConnection } from '../types';

type Connection = AuthStoreConnection & LazyConnection;
type FakeConnection = Connection & { store: Map<string, string> };

/**
 * A plain in-memory fake satisfying the narrowed `AuthStoreConnection`. Mirrors
 * the cache tests' fake: no real ioredis server, structural conformance only.
 * Like the lib's main connection it is lazy with no offline queue: until its
 * first `connect()` has finished, every command rejects instead of queueing.
 */
const makeConnection = ({ connected = true, reachable = true } = {}): FakeConnection => {
  const store = new Map<string, string>();
  const writable = (): void => {
    if (connection.status !== 'ready') {
      throw new Error("Stream isn't writeable and enableOfflineQueue options is false");
    }
  };
  const connection = {
    store,
    status: connected ? 'ready' : 'wait',
    connect: vi.fn(async () => {
      connection.status = 'connecting';
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (!reachable) {
        connection.status = 'reconnecting';
        throw new Error('connect ECONNREFUSED');
      }
      connection.status = 'ready';
    }),
    get: (async (key: string) => {
      writable();
      return store.get(key) ?? null;
    }) as AuthStoreConnection['get'],
    set: (async (key: string, value: string) => {
      writable();
      // The `EX`/ttl args are irrelevant to the fake's storage; ignore them.
      store.set(key, value);
      return 'OK';
    }) as AuthStoreConnection['set'],
    del: (async (...keys: string[]) => {
      writable();
      let removed = 0;
      for (const key of keys) if (store.delete(key)) removed++;
      return removed;
    }) as AuthStoreConnection['del'],
    getdel: (async (key: string) => {
      writable();
      const value = store.get(key) ?? null;
      store.delete(key);
      return value;
    }) as AuthStoreConnection['getdel'],
    incr: (async (key: string) => {
      writable();
      const next = Number(store.get(key) ?? '0') + 1;
      store.set(key, String(next));
      return next;
    }) as AuthStoreConnection['incr'],
    expire: (async (key: string) => {
      writable();
      return store.has(key) ? 1 : 0;
    }) as AuthStoreConnection['expire'],
  };
  return connection;
};

// A connected client whose every command rejects — stands in for Redis going down.
const brokenConnection = (): Connection => {
  const boom = () => Promise.reject(new Error('redis down'));
  return {
    status: 'reconnecting',
    connect: vi.fn(),
    get: boom as AuthStoreConnection['get'],
    set: boom as unknown as AuthStoreConnection['set'],
    del: boom as AuthStoreConnection['del'],
    getdel: boom as AuthStoreConnection['getdel'],
    incr: boom as AuthStoreConnection['incr'],
    expire: boom as AuthStoreConnection['expire'],
  };
};

// Wired the way `createRedis` wires it: the manager's connector over the same connection.
const authStoreOver = (connection: Connection): AuthStore =>
  createAuthStore({ connection, connect: createConnector(connection) });

describe('createAuthStore', () => {
  it('round-trips a value through set and get', async () => {
    const store = authStoreOver(makeConnection());

    await store.set('session:abc', 'token-payload');

    expect(await store.get('session:abc')).toBe('token-payload');
  });

  it('returns null for a key that was never set', async () => {
    const store = authStoreOver(makeConnection());

    expect(await store.get('missing')).toBeNull();
  });

  it('namespaces every key under the auth: prefix', async () => {
    const connection = makeConnection();
    const store = authStoreOver(connection);

    await store.set('session:abc', 'v');

    expect([...connection.store.keys()]).toEqual(['auth:session:abc']);
    // Reads go through the same prefix, so the round-trip resolves.
    expect(await store.get('session:abc')).toBe('v');
  });

  it('passes a TTL through as SET ... EX (seconds)', async () => {
    const connection = makeConnection();
    const spy = vi.spyOn(connection, 'set');
    const store = authStoreOver(connection);

    await store.set('session:abc', 'v', 3600);

    expect(spy).toHaveBeenCalledWith('auth:session:abc', 'v', 'EX', 3600);
  });

  it('sets without an expiry when no TTL is given', async () => {
    const connection = makeConnection();
    const spy = vi.spyOn(connection, 'set');
    const store = authStoreOver(connection);

    await store.set('session:abc', 'v');

    expect(spy).toHaveBeenCalledWith('auth:session:abc', 'v');
  });

  it('deletes a single namespaced key', async () => {
    const connection = makeConnection();
    const store = authStoreOver(connection);
    await store.set('session:abc', 'v');

    await store.delete('session:abc');

    expect(await store.get('session:abc')).toBeNull();
    expect(connection.store.has('auth:session:abc')).toBe(false);
  });

  it('getAndDelete returns the value and removes the key (GETDEL)', async () => {
    const connection = makeConnection();
    const store = authStoreOver(connection);
    await store.set('verification:xyz', 'one-time');

    const value = await store.getAndDelete('verification:xyz');

    expect(value).toBe('one-time');
    expect(await store.get('verification:xyz')).toBeNull();
  });

  it('getAndDelete returns null for a missing key', async () => {
    const store = authStoreOver(makeConnection());

    expect(await store.getAndDelete('nope')).toBeNull();
  });

  it('increment bumps a counter and returns the new value (INCR)', async () => {
    const connection = makeConnection();
    const store = authStoreOver(connection);

    expect(await store.increment('ratelimit:ip', 60)).toBe(1);
    expect(await store.increment('ratelimit:ip', 60)).toBe(2);
    expect(connection.store.get('auth:ratelimit:ip')).toBe('2');
  });

  it('applies the TTL only when the counter is first created (EXPIRE on INCR===1)', async () => {
    const connection = makeConnection();
    const spy = vi.spyOn(connection, 'expire');
    const store = authStoreOver(connection);

    await store.increment('ratelimit:ip', 60);
    await store.increment('ratelimit:ip', 60);
    await store.increment('ratelimit:ip', 60);

    // Expiry set once, on creation, with the namespaced key and ttl — never extended.
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('auth:ratelimit:ip', 60);
  });

  describe('is NOT fail-open — Redis errors propagate (ADR-0010 §3)', () => {
    it('rejects when get fails', async () => {
      const store = authStoreOver(brokenConnection());

      await expect(store.get('k')).rejects.toThrow('redis down');
    });

    it('rejects when set fails', async () => {
      const store = authStoreOver(brokenConnection());

      await expect(store.set('k', 'v', 60)).rejects.toThrow('redis down');
    });

    it('rejects when delete fails', async () => {
      const store = authStoreOver(brokenConnection());

      await expect(store.delete('k')).rejects.toThrow('redis down');
    });

    it('rejects when getAndDelete fails', async () => {
      const store = authStoreOver(brokenConnection());

      await expect(store.getAndDelete('k')).rejects.toThrow('redis down');
    });

    it('rejects when increment fails', async () => {
      const store = authStoreOver(brokenConnection());

      await expect(store.increment('k', 60)).rejects.toThrow('redis down');
    });

    it('rejects with the connect error when Redis is down before the first connect', async () => {
      const store = authStoreOver(makeConnection({ connected: false, reachable: false }));

      await expect(store.get('session:abc')).rejects.toThrow('connect ECONNREFUSED');
    });
  });

  describe('on a connection that has never connected', () => {
    it.each<[string, (store: AuthStore) => Promise<unknown>]>([
      ['get', (store) => store.get('session:abc')],
      ['set', (store) => store.set('session:abc', 'v', 60)],
      ['delete', (store) => store.delete('session:abc')],
      ['getAndDelete', (store) => store.getAndDelete('verification:xyz')],
      ['increment', (store) => store.increment('ratelimit:ip', 60)],
    ])('connects it rather than failing a first %s', async (_name, firstCommand) => {
      const connection = makeConnection({ connected: false });

      await expect(firstCommand(authStoreOver(connection))).resolves.not.toThrow();
      expect(connection.connect).toHaveBeenCalledTimes(1);
    });

    it('serves every request that arrives while the first connect is in flight', async () => {
      const connection = makeConnection({ connected: false });
      connection.store.set('auth:session:abc', 'token-payload');
      const store = authStoreOver(connection);

      const results = await Promise.all([
        store.get('session:abc'),
        store.increment('ratelimit:ip', 60),
        store.get('session:abc'),
      ]);

      expect(results).toEqual(['token-payload', 1, 'token-payload']);
      expect(connection.connect).toHaveBeenCalledTimes(1);
    });
  });
});
