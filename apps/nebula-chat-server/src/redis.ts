import { buildKey, createRedis, hashText } from '@nebula-chat/redis';
import type { RedisToolkit } from '@nebula-chat/redis';
import { env } from '@backend/env';
import { logger } from '@backend/logger';
import type { CreateChatStreamDTO, UsageData } from '@backend/modules/chat/chat.types';

/**
 * The server's single Redis toolkit (shared connection + cache primitive),
 * mirroring `src/db.ts`. Config and loading live here — consumers import from
 * `@backend/redis` rather than constructing their own. Default cache TTL is 10
 * minutes; the keyspace is bounded by TTL + Redis `maxmemory-policy`.
 */
export const redis: RedisToolkit = createRedis({
  redisUrl: env.REDIS_URL,
  logger,
  cache: { defaultTtlSeconds: 600 },
});

export const closeRedis = (): Promise<void> => redis.close();

/** A previously captured SSE token stream, replayed verbatim on a cache hit. */
export type CachedStreamData = {
  tokens: string;
  usageData?: UsageData;
};

/**
 * The cache key for a chat request. Kept exactly as the pre-migration cache had
 * it — conversation + model + hash of the last user message — per ADR-0009. The
 * correct-key rework (full context, temperature, system prompt) is a separate
 * future ticket. Key composition and hashing come from `@nebula-chat/redis`.
 */
export const chatCacheKey = (data: CreateChatStreamDTO): string => {
  const conversationId = data.conversationId ?? 'default';
  const lastUserMessage = [...data.messages].reverse().find((msg) => msg.role === 'user');
  const prompt = lastUserMessage?.content ?? '';

  return buildKey('conversation', conversationId, 'model', data.model, 'prompt', hashText(prompt));
};

export const getCachedStream = (key: string): Promise<CachedStreamData | null> =>
  redis.cache.get<CachedStreamData>(key);

export const saveCachedStream = (
  key: string,
  tokens: string,
  usageData?: UsageData,
): Promise<void> => redis.cache.set(key, { tokens, ...(usageData !== undefined && { usageData }) });
