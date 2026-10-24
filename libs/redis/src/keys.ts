import { createHash } from 'node:crypto';

/**
 * Short, stable hex digest of arbitrary text, for use inside a cache key. The
 * same input always produces the same digest, so identical requests hash to the
 * same key.
 */
export const hashText = (text: string, length = 16): string =>
  createHash('sha256').update(text).digest('hex').slice(0, length);

/**
 * Compose a cache key from ordered parts using the `a:b:c` convention. Centralised
 * here so key formats live in one place rather than being hand-concatenated at
 * call sites.
 */
export const buildKey = (...parts: (string | number)[]): string => parts.join(':');

/**
 * Namespace prefix for every key the `authStore` primitive writes. Keeping auth
 * state under its own prefix means better-auth's sessions/verification/rate-limit
 * keys can never collide with cache keys sharing the same Redis keyspace.
 */
export const AUTH_KEY_PREFIX = 'auth';

/**
 * Namespace an auth key under the `auth:` prefix. Composed through `buildKey` so
 * the `a:b:c` key convention stays centralised rather than hand-concatenated.
 */
export const authKey = (key: string): string => buildKey(AUTH_KEY_PREFIX, key);

/** The key of the Redis Stream that carries one reply, keyed by its `streamId` (ADR-0014). */
export const streamKey = (streamId: string): string => buildKey('stream', streamId);

/** The flag that asks the worker to stop producing one reply (ADR-0014). */
export const streamCancelKey = (streamId: string): string => buildKey('stream-cancel', streamId);

/**
 * The flag the worker raises once a reply stream has its terminal event. It outlives the stream,
 * so a reader can tell a stream that has expired from one whose job is still queued.
 */
export const streamEndedKey = (streamId: string): string => buildKey('stream-ended', streamId);
