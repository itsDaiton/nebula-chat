import { describe, it, expect, vi } from 'vitest';
import { createAuthStore } from '../authStore';
import type { AuthStoreConnection } from '../types';

type FakeConnection = AuthStoreConnection & { store: Map<string, string> };

/**
 * A plain in-memory fake satisfying the narrowed `AuthStoreConnection`. Mirrors
 * the cache tests' fake: no real ioredis server, structural conformance only.
 */
const makeConnection = (): FakeConnection => {
  const store = new Map<string, string>();
  return {
    store,
    get: (async (key: string) => store.get(key) ?? null) as AuthStoreConnection['get'],
    set: (async (key: string, value: string) => {
      // The `EX`/ttl args are irrelevant to the fake's storage; ignore them.
      store.set(key, value);
      return 'OK';
    }) as AuthStoreConnection['set'],
    del: (async (...keys: string[]) => {
      let removed = 0;
      for (const key of keys) if (store.delete(key)) removed++;
      return removed;
    }) as AuthStoreConnection['del'],
    getdel: (async (key: string) => {
      const value = store.get(key) ?? null;
      store.delete(key);
      return value;
    }) as AuthStoreConnection['getdel'],
    incr: (async (key: string) => {
      const next = Number(store.get(key) ?? '0') + 1;
      store.set(key, String(next));
      return next;
    }) as AuthStoreConnection['incr'],
  };
};

// A connection whose every command rejects — stands in for Redis being down.
const brokenConnection = (): AuthStoreConnection => {
  const boom = () => Promise.reject(new Error('redis down'));
  return {
    get: boom as AuthStoreConnection['get'],
    set: boom as unknown as AuthStoreConnection['set'],
    del: boom as AuthStoreConnection['del'],
    getdel: boom as AuthStoreConnection['getdel'],
    incr: boom as AuthStoreConnection['incr'],
  };
};

describe('createAuthStore', () => {
  it('round-trips a value through set and get', async () => {
    const store = createAuthStore({ connection: makeConnection() });

    await store.set('session:abc', 'token-payload');

    expect(await store.get('session:abc')).toBe('token-payload');
  });

  it('returns null for a key that was never set', async () => {
    const store = createAuthStore({ connection: makeConnection() });

    expect(await store.get('missing')).toBeNull();
  });

  it('namespaces every key under the auth: prefix', async () => {
    const connection = makeConnection();
    const store = createAuthStore({ connection });

    await store.set('session:abc', 'v');

    expect([...connection.store.keys()]).toEqual(['auth:session:abc']);
    // Reads go through the same prefix, so the round-trip resolves.
    expect(await store.get('session:abc')).toBe('v');
  });

  it('passes a TTL through as SET ... EX (seconds)', async () => {
    const connection = makeConnection();
    const spy = vi.spyOn(connection, 'set');
    const store = createAuthStore({ connection });

    await store.set('session:abc', 'v', 3600);

    expect(spy).toHaveBeenCalledWith('auth:session:abc', 'v', 'EX', 3600);
  });

  it('sets without an expiry when no TTL is given', async () => {
    const connection = makeConnection();
    const spy = vi.spyOn(connection, 'set');
    const store = createAuthStore({ connection });

    await store.set('session:abc', 'v');

    expect(spy).toHaveBeenCalledWith('auth:session:abc', 'v');
  });

  it('deletes a single namespaced key', async () => {
    const connection = makeConnection();
    const store = createAuthStore({ connection });
    await store.set('session:abc', 'v');

    await store.delete('session:abc');

    expect(await store.get('session:abc')).toBeNull();
    expect(connection.store.has('auth:session:abc')).toBe(false);
  });

  it('getAndDelete returns the value and removes the key (GETDEL)', async () => {
    const connection = makeConnection();
    const store = createAuthStore({ connection });
    await store.set('verification:xyz', 'one-time');

    const value = await store.getAndDelete('verification:xyz');

    expect(value).toBe('one-time');
    expect(await store.get('verification:xyz')).toBeNull();
  });

  it('getAndDelete returns null for a missing key', async () => {
    const store = createAuthStore({ connection: makeConnection() });

    expect(await store.getAndDelete('nope')).toBeNull();
  });

  it('increment bumps a counter and returns the new value (INCR)', async () => {
    const connection = makeConnection();
    const store = createAuthStore({ connection });

    expect(await store.increment('ratelimit:ip')).toBe(1);
    expect(await store.increment('ratelimit:ip')).toBe(2);
    expect(connection.store.get('auth:ratelimit:ip')).toBe('2');
  });

  describe('is NOT fail-open — Redis errors propagate (ADR-0010 §3)', () => {
    it('rejects when get fails', async () => {
      const store = createAuthStore({ connection: brokenConnection() });

      await expect(store.get('k')).rejects.toThrow('redis down');
    });

    it('rejects when set fails', async () => {
      const store = createAuthStore({ connection: brokenConnection() });

      await expect(store.set('k', 'v', 60)).rejects.toThrow('redis down');
    });

    it('rejects when delete fails', async () => {
      const store = createAuthStore({ connection: brokenConnection() });

      await expect(store.delete('k')).rejects.toThrow('redis down');
    });

    it('rejects when getAndDelete fails', async () => {
      const store = createAuthStore({ connection: brokenConnection() });

      await expect(store.getAndDelete('k')).rejects.toThrow('redis down');
    });

    it('rejects when increment fails', async () => {
      const store = createAuthStore({ connection: brokenConnection() });

      await expect(store.increment('k')).rejects.toThrow('redis down');
    });
  });
});
