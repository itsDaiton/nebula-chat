import { createHash } from 'node:crypto'

/**
 * Short, stable hex digest of arbitrary text, for use inside a cache key. The
 * same input always produces the same digest, so identical requests hash to the
 * same key.
 */
export const hashText = (text: string, length = 16): string =>
  createHash('sha256').update(text).digest('hex').slice(0, length)

/**
 * Compose a cache key from ordered parts using the `a:b:c` convention. Centralised
 * here so key formats live in one place rather than being hand-concatenated at
 * call sites.
 */
export const buildKey = (...parts: Array<string | number>): string => parts.join(':')

/**
 * Namespace prefix for every key the `authStore` primitive writes. Keeping auth
 * state under its own prefix means better-auth's sessions/verification/rate-limit
 * keys can never collide with cache keys sharing the same Redis keyspace.
 */
export const AUTH_KEY_PREFIX = 'auth'

/**
 * Namespace an auth key under the `auth:` prefix. Composed through `buildKey` so
 * the `a:b:c` key convention stays centralised rather than hand-concatenated.
 */
export const authKey = (key: string): string => buildKey(AUTH_KEY_PREFIX, key)
