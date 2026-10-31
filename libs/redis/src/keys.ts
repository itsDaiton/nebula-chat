import { createHash } from 'node:crypto';

/**
 * Short, stable hex digest of text for use inside a cache key; identical input hashes to the same key.
 */
export const hashText = (text: string, length = 16): string =>
  createHash('sha256').update(text).digest('hex').slice(0, length);

/** Composes a cache key from ordered parts as `a:b:c`, so key formats live in one place. */
export const buildKey = (...parts: (string | number)[]): string => parts.join(':');

/**
 * Namespace prefix for every key the `authStore` writes, so auth state never collides with cache keys.
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

/** The flag that cancels a Run waiting on a Clarifying question, which has no stream to poll. */
export const runCancelKey = (runId: string): string => buildKey('run-cancel', runId);

/**
 * The flag the worker raises once a reply stream has its terminal event. It outlives the stream,
 * so a reader can tell a stream that has expired from one whose job is still queued.
 */
export const streamEndedKey = (streamId: string): string => buildKey('stream-ended', streamId);

/** How long a reply stream's records (its owner, its ended flag) outlive it: a day. */
export const REPLY_STREAM_RECORD_TTL_SECONDS = 24 * 60 * 60;
