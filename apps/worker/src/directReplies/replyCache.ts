import { z } from 'zod';
import { componentLogger, logEvent } from '@nebula-chat/otel';
import type { Logger } from '@nebula-chat/otel';
import { buildKey, hashText } from '@nebula-chat/redis';

// Tokens, not SSE frames: the event shape belongs to contracts and the framing to the server.
const cachedReplySchema = z.object({
  tokens: z.array(z.string()).min(1),
  usage: z
    .object({
      promptTokens: z.number().int().nonnegative(),
      completionTokens: z.number().int().nonnegative(),
      totalTokens: z.number().int().nonnegative(),
    })
    .optional(),
});

/** A Cache entry (GLOSSARY.md): what a completed Direct reply streamed. */
export type CachedReply = z.infer<typeof cachedReplySchema>;

/** Where Cache entries live: `@nebula-chat/redis`'s `cache` in production. */
export type ReplyCache = {
  get: (key: string) => Promise<unknown>;
  set: (key: string, entry: CachedReply) => Promise<void>;
};

/** Session + Model + hash of the user Message; known-imperfect, and kept as it was (ADR-0009). */
export const replyCacheKey = (sessionId: string, model: string, prompt: string): string =>
  buildKey('session', sessionId, 'model', model, 'prompt', hashText(prompt));

/** The entry under `key`; a failing cache, or an entry in a shape this worker did not write, is a miss. */
export const readCachedReply = async (
  cache: ReplyCache,
  key: string,
  logger: Logger,
): Promise<CachedReply | null> => {
  try {
    const parsed = cachedReplySchema.safeParse(await cache.get(key));
    return parsed.success ? parsed.data : null;
  } catch (err) {
    logEvent(
      componentLogger(logger, 'redis'),
      'warn',
      'cache.read.failed',
      { err, 'nebula.cache.key': key },
      'Cache read failed; treating it as a miss',
    );
    return null;
  }
};

/** Stores `entry`, overwriting any; a failing cache loses the entry, never the reply. */
export const writeCachedReply = async (
  cache: ReplyCache,
  key: string,
  entry: CachedReply,
  logger: Logger,
): Promise<void> => {
  try {
    await cache.set(key, entry);
  } catch (err) {
    logEvent(
      componentLogger(logger, 'redis'),
      'warn',
      'cache.write.failed',
      { err, 'nebula.cache.key': key },
      'Cache write failed; continuing without caching',
    );
  }
};
