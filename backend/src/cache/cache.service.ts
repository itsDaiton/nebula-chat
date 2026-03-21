import { createHash } from 'node:crypto';
import type { RedisClientType } from 'redis';
import type { CachedStreamData, BaseRedisStats, CacheStats } from '@backend/cache/cache.types';
import type { CreateChatStreamDTO, UsageData } from '@backend/modules/chat/chat.types';
import { createRedisClient, isRedisConnected, closeRedisClient } from '@backend/cache/cache.client';
import { RedisCacheError } from '@backend/errors/AppError';
import { cacheConfig } from '@backend/cache/cache.config';

let redisClient: RedisClientType | null = null;

const ensureConnection = async (): Promise<RedisClientType> => {
  if (!redisClient || !isRedisConnected()) {
    redisClient = await createRedisClient();
  }
  return redisClient;
};

const parseCacheStats = async (): Promise<BaseRedisStats> => {
  try {
    const client = await ensureConnection();
    const stats = await client.get(cacheConfig.statsKey);
    if (stats) {
      return JSON.parse(stats);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error getting stats from Redis:', error);
  }

  // Fallback to default stats
  return {
    hits: 0,
    misses: 0,
    expired: 0,
    evictions: 0,
    sets: 0,
    lastEvictedKey: null,
    lastSetKey: null,
    lastHitKey: null,
  };
};

const updateStats = async (
  updater: (stats: BaseRedisStats) => Partial<BaseRedisStats>,
): Promise<void> => {
  try {
    const client = await ensureConnection();
    const stats = await parseCacheStats();
    const updatedStats = { ...stats, ...updater(stats) };
    await client.set(cacheConfig.statsKey, JSON.stringify(updatedStats));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error updating stats:', error);
  }
};

const getFromCache = async (key: string): Promise<CachedStreamData | null> => {
  try {
    const client = await ensureConnection();
    const value = await client.get(key);

    if (!value) {
      await updateStats((s) => ({ misses: s.misses + 1 }));
      return null;
    }

    const parsed: CachedStreamData = JSON.parse(value);
    await updateStats((s) => ({ hits: s.hits + 1, lastHitKey: key }));

    return parsed;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Redis GET error (fail-open):', error);
    await updateStats((s) => ({ misses: s.misses + 1 }));
    return null;
  }
};

const saveToCache = async (
  key: string,
  value: string,
  usageData?: UsageData,
  ttlMs: number = cacheConfig.defaultTTL,
): Promise<void> => {
  try {
    const client = await ensureConnection();
    const cachedData: CachedStreamData = {
      tokens: value,
      ...(usageData !== undefined && { usageData }),
    };

    const serialized = JSON.stringify(cachedData);
    await client.setEx(key, Math.floor(ttlMs / 1000), serialized);

    await client.lPush(cacheConfig.keysList, key);

    let evictions = 0;
    let lastEvictedKey: string | null = null;
    let size = await client.lLen(cacheConfig.keysList);
    while (size > cacheConfig.maxItems) {
      const oldestKey = await client.rPop(cacheConfig.keysList);
      if (!oldestKey) break;
      await client.del(oldestKey);
      evictions++;
      lastEvictedKey = oldestKey;
      size--;
    }
    if (evictions > 0 && lastEvictedKey !== null) {
      await updateStats((s) => ({
        evictions: s.evictions + evictions,
        lastEvictedKey,
      }));
    }

    await updateStats((s) => ({ sets: s.sets + 1, lastSetKey: key }));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Redis SET error (fail-open):', error);
  }
};

const generateKey = (data: CreateChatStreamDTO): string => {
  const model = data.model;
  const conversationId = data.conversationId || 'default';
  const lastUserMessage = [...data.messages].reverse().find((msg) => msg.role === 'user');
  const prompt = lastUserMessage?.content || '';

  const promptHash = createHash('sha256').update(prompt).digest('hex').substring(0, 16);

  return `conversation:${conversationId}:model:${model}:prompt:${promptHash}`;
};

const getCacheStats = async (): Promise<CacheStats> => {
  try {
    const client = await ensureConnection();
    const stats = await parseCacheStats();
    const size = await client.lLen(cacheConfig.keysList);

    const totalRequests = stats.hits + stats.misses;
    const hitRate = totalRequests > 0 ? stats.hits / totalRequests : 0;
    const missRate = totalRequests > 0 ? stats.misses / totalRequests : 0;
    const expiredRate = totalRequests > 0 ? stats.expired / totalRequests : 0;
    const isHealthy = hitRate > 0.25 || size < 50;

    return {
      size,
      activeItems: size,
      expiredItems: 0,
      maxItems: cacheConfig.maxItems,
      defaultTtlMs: cacheConfig.defaultTTL,
      stats: {
        ...stats,
        hitRate,
        missRate,
        expiredRate,
        averageTTLremaining: 0,
        oldestTTL: 0,
        newestTTL: 0,
        isHealthy,
      },
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Redis STATS error (fail-open):', error);
    return {
      size: 0,
      activeItems: 0,
      expiredItems: 0,
      maxItems: cacheConfig.maxItems,
      defaultTtlMs: cacheConfig.defaultTTL,
      stats: {
        hits: 0,
        misses: 0,
        expired: 0,
        evictions: 0,
        sets: 0,
        lastEvictedKey: null,
        lastSetKey: null,
        lastHitKey: null,
        hitRate: 0,
        missRate: 0,
        expiredRate: 0,
        averageTTLremaining: 0,
        oldestTTL: 0,
        newestTTL: 0,
        isHealthy: false,
      },
    };
  }
};

const clearCache = async (): Promise<void> => {
  try {
    const client = await ensureConnection();
    const keys = await client.lRange(cacheConfig.keysList, 0, -1);
    if (keys.length > 0) {
      await client.del(keys);
    }
    await client.del(cacheConfig.keysList);
    await client.del(cacheConfig.statsKey);

    // eslint-disable-next-line no-console
    console.log('Redis: Cache cleared');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Redis CLEAR error:', error);
    throw new RedisCacheError(`Failed to clear cache: ${error}`);
  }
};

const getRecentKeys = async (limit: number = 20): Promise<string[]> => {
  try {
    const client = await ensureConnection();
    return await client.lRange(cacheConfig.keysList, 0, limit - 1);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Redis GET_KEYS error (fail-open):', error);
    return [];
  }
};

const healthCheck = async (): Promise<{ status: 'ok' }> => ({ status: 'ok' });

const closeCache = async (): Promise<void> => {
  await closeRedisClient();
  redisClient = null;
};

export const cacheService = {
  getFromCache,
  saveToCache,
  generateKey,
  getCacheStats,
  clearCache,
  getRecentKeys,
  healthCheck,
  closeCache,
};
