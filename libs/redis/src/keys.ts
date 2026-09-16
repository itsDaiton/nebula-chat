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
