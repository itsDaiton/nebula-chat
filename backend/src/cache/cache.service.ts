import { createHash } from 'crypto';
import type { RedisClientType } from 'redis';
import type { CachedStreamData, BaseRedisStats, CacheStats } from '@backend/cache/cache.types';
import type { CreateChatStreamDTO } from '@backend/modules/chat/chat.types';
import { createRedisClient, isRedisConnected, closeRedisClient } from '@backend/cache/cache.client';
import { RedisCacheError } from '@backend/errors/AppError';
import { cacheConfig } from './cache.config';

let redisClient: RedisClientType | null = null;

async function ensureConnection(): Promise<RedisClientType> {
  if (!redisClient || !isRedisConnected()) {
    redisClient = await createRedisClient();
  }
  return redisClient;
}

async function parseCacheStats(): Promise<BaseRedisStats> {
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
}

async function updateStats(updates: Partial<BaseRedisStats>): Promise<void> {
  try {
    const client = await ensureConnection();
    const stats = await parseCacheStats();
    const updatedStats = { ...stats, ...updates };
    await client.set(cacheConfig.statsKey, JSON.stringify(updatedStats));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error updating stats:', error);
  }
}

async function getFromCache(key: string): Promise<CachedStreamData | null> {
  try {
    const client = await ensureConnection();
    const value = await client.get(key);

    if (!value) {
      await updateStats({ misses: (await parseCacheStats()).misses + 1 });
      return null;
    }

    const parsed: CachedStreamData = JSON.parse(value);
    await updateStats({
      hits: (await parseCacheStats()).hits + 1,
      lastHitKey: key,
    });

    return parsed;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Redis GET error (fail-open):', error);
    await updateStats({ misses: (await parseCacheStats()).misses + 1 });
    return null;
  }
}

async function saveToCache(
  key: string,
  value: string,
  usageData?: any,
  ttlMs: number = cacheConfig.defaultTTL,
): Promise<void> {
  try {
    const client = await ensureConnection();
    const cachedData: CachedStreamData = {
      tokens: value,
      usageData,
    };

    const serialized = JSON.stringify(cachedData);
    await client.setEx(key, Math.floor(ttlMs / 1000), serialized);

    await client.lPush(cacheConfig.keysList, key);
    await client.lTrim(cacheConfig.keysList, 0, cacheConfig.maxItems - 1);

    const size = await client.lLen(cacheConfig.keysList);
    if (size > cacheConfig.maxItems) {
      const oldestKey = await client.rPop(cacheConfig.keysList);
      if (oldestKey) {
        await client.del(oldestKey);
        await updateStats({
          evictions: (await parseCacheStats()).evictions + 1,
          lastEvictedKey: oldestKey,
        });
      }
    }

    await updateStats({
      sets: (await parseCacheStats()).sets + 1,
      lastSetKey: key,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Redis SET error (fail-open):', error);
  }
}

function generateKey(data: CreateChatStreamDTO): string {
  const model = data.model;
  const conversationId = data.conversationId || 'default';
  const lastUserMessage = [...data.messages].reverse().find((msg) => msg.role === 'user');
  const prompt = lastUserMessage?.content || '';

  const promptHash = createHash('sha256').update(prompt).digest('hex').substring(0, 16);

  return `conversation:${conversationId}:model:${model}:prompt:${promptHash}`;
}

async function getCacheStats(): Promise<CacheStats> {
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
}

async function clearCache(): Promise<void> {
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
}

async function getRecentKeys(limit: number = 20): Promise<string[]> {
  try {
    const client = await ensureConnection();
    return await client.lRange(cacheConfig.keysList, 0, limit - 1);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Redis GET_KEYS error (fail-open):', error);
    return [];
  }
}

async function healthCheck(): Promise<{ status: 'ok' }> {
  return { status: 'ok' };
}

async function closeCache(): Promise<void> {
  await closeRedisClient();
  redisClient = null;
}

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
