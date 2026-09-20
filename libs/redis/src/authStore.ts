import type { AuthStoreConnection } from './types'
import { authKey } from './keys'

/**
 * A Redis-backed implementation of better-auth's `SecondaryStorage` interface —
 * `get` / `set` / `delete` / `getAndDelete` / `increment` (better-auth 1.7 folded
 * `getAndDelete` for one-time tokens and `increment` for rate-limit counters into
 * the interface itself) — the methods M-6 wires better-auth's `secondaryStorage`,
 * `session` and `rateLimit` state onto.
 *
 * **This primitive is deliberately NOT fail-open.** Unlike the `cache` primitive
 * (which swallows Redis errors into a miss/no-op per ADR-0009), the authStore lets
 * every Redis error propagate to the caller: Redis is a hard dependency for login
 * (ADR-0010 §3), so an outage must surface as a failed request rather than be
 * silently masked. It therefore holds no try/catch and injects no logger — the
 * caller (better-auth, then Fastify) owns the failure.
 *
 * Every key is namespaced under `auth:` (via `authKey`) so auth state never
 * collides with cache keys sharing the same Redis keyspace.
 *
 * The shape matches better-auth's `SecondaryStorage`:
 * ```ts
 * get:          (key) => Promise<string | null> | string | null;
 * getAndDelete: (key) => Promise<string | null> | string | null;
 * increment:    (key, ttl) => Promise<number> | number; // ttl in seconds, applied on create
 * set:          (key, value, ttl?) => Promise<void | null | string> | void; // ttl in seconds
 * delete:       (key) => Promise<void | null | string> | void;
 * ```
 * `AuthStore` satisfies it structurally without `libs/redis` depending on
 * `better-auth`; `libs/auth` (M-6) passes this straight to `secondaryStorage`.
 */
export interface AuthStore {
  /** Returns the raw stored string, or `null` on a miss. Errors propagate. */
  get: (key: string) => Promise<string | null>
  /**
   * Stores a raw string. `ttlSeconds` (better-auth passes seconds) is applied via
   * `SET ... EX`; when omitted the key is set without an expiry. Errors propagate.
   */
  set: (key: string, value: string, ttlSeconds?: number) => Promise<void>
  /** Removes a single key. Errors propagate. */
  delete: (key: string) => Promise<void>
  /** Atomically reads and removes a key (`GETDEL`). Errors propagate. */
  getAndDelete: (key: string) => Promise<string | null>
  /**
   * Increments the counter at `key` by one (`INCR`) and returns the new value.
   * The `ttlSeconds` expiry is applied only when the counter is first created
   * (i.e. `INCR` returns `1`); later increments never extend it, so the window is
   * fixed from creation — the contract better-auth's secondary-storage rate
   * limiter depends on. Errors propagate.
   */
  increment: (key: string, ttlSeconds: number) => Promise<number>
}

interface CreateAuthStoreDeps {
  connection: AuthStoreConnection
}

export const createAuthStore = ({ connection }: CreateAuthStoreDeps): AuthStore => {
  const get = async (key: string): Promise<string | null> => connection.get(authKey(key))

  const set = async (key: string, value: string, ttlSeconds?: number): Promise<void> => {
    if (ttlSeconds === undefined) {
      await connection.set(authKey(key), value)
      return
    }
    await connection.set(authKey(key), value, 'EX', ttlSeconds)
  }

  const del = async (key: string): Promise<void> => {
    await connection.del(authKey(key))
  }

  const getAndDelete = async (key: string): Promise<string | null> =>
    connection.getdel(authKey(key))

  const increment = async (key: string, ttlSeconds: number): Promise<number> => {
    const namespaced = authKey(key)
    const value = await connection.incr(namespaced)
    // Apply the TTL only on creation, so the window is fixed from first increment
    // and never extended by subsequent ones (better-auth's rate-limit contract).
    if (value === 1) {
      await connection.expire(namespaced, ttlSeconds)
    }
    return value
  }

  return { get, set, delete: del, getAndDelete, increment }
}
