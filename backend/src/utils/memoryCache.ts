import type { CacheEntry } from '@backend/types/cache.types';
import type { ChatHistoryRequestBody } from '@backend/types/chat.types';

const cache = new Map<string, CacheEntry>();

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const MAX_ITEMS = 1000;

const cacheStats = {
  hits: 0,
  misses: 0,
  expired: 0,
  evictions: 0,
  sets: 0,
  lastEvictedKey: null as string | null,
  lastSetKey: null as string | null,
  lastHitKey: null as string | null,
};

const markAsUsed = (key: string, entry: CacheEntry) => {
  cache.delete(key);
  cache.set(key, entry);
};

const evictLeastRecentlyUsed = () => {
  const oldestKey = cache.keys().next().value;
  if (oldestKey !== undefined) {
    cache.delete(oldestKey);
    cacheStats.evictions++;
    cacheStats.lastEvictedKey = oldestKey;
  }
};

export const getFromCache = (key: string): string | undefined => {
  const entry = cache.get(key);
  if (!entry) {
    cacheStats.misses++;
    return undefined;
  }
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    cacheStats.expired++;
    return undefined;
  }
  cacheStats.hits++;
  cacheStats.lastHitKey = key;
  markAsUsed(key, entry);
  return entry.value;
};

export const saveToCache = (key: string, value: string, ttlMs: number = DEFAULT_TTL_MS): void => {
  const entry = {
    value,
    expiresAt: Date.now() + ttlMs,
  };
  if (cache.has(key)) {
    markAsUsed(key, entry);
    cacheStats.sets++;
    cacheStats.lastSetKey = key;
    return;
  }
  if (cache.size >= MAX_ITEMS) {
    evictLeastRecentlyUsed();
  }
  cache.set(key, entry);
  cacheStats.sets++;
  cacheStats.lastSetKey = key;
};

export const generateKey = (data: ChatHistoryRequestBody): string => {
  const model = data.model;
  const lastUserMessage = [...data.messages].reverse().find((msg) => msg.role === 'user');
  const prompt = lastUserMessage?.content || '';
  return JSON.stringify({ model, prompt });
};

setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now > entry.expiresAt) {
        cache.delete(key);
        cacheStats.expired++;
      }
    }
  },
  30 * 60 * 1000,
).unref();

export const getCacheStats = () => {
  const now = Date.now();
  let activeCount = 0;
  let expiredCount = 0;

  let ttlSum = 0;
  let ttlCount = 0;

  let oldestTTL = Infinity;
  let newestTTL = -Infinity;

  for (const [, entry] of cache.entries()) {
    const remaining = entry.expiresAt - now;

    if (remaining <= 0) {
      expiredCount++;
      continue;
    }
    activeCount++;
    ttlSum += remaining;
    ttlCount++;

    if (remaining < oldestTTL) {
      oldestTTL = remaining;
    }

    if (remaining > newestTTL) {
      newestTTL = remaining;
    }
  }

  const totalRequests = cacheStats.hits + cacheStats.misses;
  const hitRate = totalRequests > 0 ? cacheStats.hits / totalRequests : 0;
  const missRate = totalRequests > 0 ? cacheStats.misses / totalRequests : 0;
  const expiredRate = totalRequests > 0 ? cacheStats.expired / totalRequests : 0;
  const averageTTLremaining = ttlCount > 0 ? Math.round(ttlSum / ttlCount) : 0;
  const isHealthy = hitRate > 0.25 || cache.size < 50;

  return {
    size: cache.size,
    activeItems: activeCount,
    expiredItems: expiredCount,
    maxItems: MAX_ITEMS,
    defaultTtlMs: DEFAULT_TTL_MS,
    stats: {
      ...cacheStats,
      hitRate,
      missRate,
      expiredRate,
      averageTTLremaining,
      oldestTTL: oldestTTL === Infinity ? 0 : oldestTTL,
      newestTTL: newestTTL === -Infinity ? 0 : newestTTL,
      isHealty: isHealthy,
    },
  };
};

export const clearCache = () => {
  cache.clear();
  cacheStats.hits = 0;
  cacheStats.misses = 0;
  cacheStats.expired = 0;
  cacheStats.evictions = 0;
  cacheStats.sets = 0;
  cacheStats.lastEvictedKey = null;
  cacheStats.lastSetKey = null;
  cacheStats.lastHitKey = null;
};

export const getRecentKeys = (limit: number = 20) => {
  const keys = Array.from(cache.keys());
  const recent = keys.slice(-limit).reverse();
  return recent;
};
