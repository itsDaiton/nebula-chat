import type { AuthStoreConnection } from './types';
import { authKey } from './keys';

/**
 * A Redis-backed `SecondaryStorage` for better-auth (get/set/delete/getAndDelete/increment), namespaced under `auth:`.
 * Deliberately NOT fail-open: Redis is a hard dependency for login (ADR-0010 §3), so errors propagate and every command awaits `connect` first.
 */
export type AuthStore = {
  /** Returns the raw stored string, or `null` on a miss. Errors propagate. */
  get(key: string): Promise<string | null>;
  /**
   * Stores a raw string. `ttlSeconds` (better-auth passes seconds) is applied via
   * `SET ... EX`; when omitted the key is set without an expiry. Errors propagate.
   */
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  /** Removes a single key. Errors propagate. */
  delete(key: string): Promise<void>;
  /** Atomically reads and removes a key (`GETDEL`). Errors propagate. */
  getAndDelete(key: string): Promise<string | null>;
  /**
   * Increments the counter at `key` and returns it; `ttlSeconds` applies only on creation (`INCR` returns 1), the fixed window better-auth's rate limiter needs.
   */
  increment(key: string, ttlSeconds: number): Promise<number>;
};

type CreateAuthStoreDeps = {
  connection: AuthStoreConnection;
  /** Opens `connection` if it has never connected (the manager's shared `connect`). */
  connect: () => Promise<void>;
};

export const createAuthStore = ({ connection, connect }: CreateAuthStoreDeps): AuthStore => {
  const get = async (key: string): Promise<string | null> => {
    await connect();
    return connection.get(authKey(key));
  };

  const set = async (key: string, value: string, ttlSeconds?: number): Promise<void> => {
    await connect();
    if (ttlSeconds === undefined) {
      await connection.set(authKey(key), value);
      return;
    }
    await connection.set(authKey(key), value, 'EX', ttlSeconds);
  };

  const del = async (key: string): Promise<void> => {
    await connect();
    await connection.del(authKey(key));
  };

  const getAndDelete = async (key: string): Promise<string | null> => {
    await connect();
    return connection.getdel(authKey(key));
  };

  const increment = async (key: string, ttlSeconds: number): Promise<number> => {
    await connect();
    const namespaced = authKey(key);
    const value = await connection.incr(namespaced);
    // Apply the TTL only on creation, so the window is fixed from first increment
    // and never extended by subsequent ones (better-auth's rate-limit contract).
    if (value === 1) {
      await connection.expire(namespaced, ttlSeconds);
    }
    return value;
  };

  return { get, set, delete: del, getAndDelete, increment };
};
