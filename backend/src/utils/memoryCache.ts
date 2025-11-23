import type { CacheEntry } from '@backend/types/chace.types';

const cache = new Map<string, CacheEntry>();

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const MAX_ITEMS = 1000;

const cacheStats = {
  hits: 0,
  misses: 0,
  expired: 0,
  evictions: 0,
  sets: 0,
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
    return;
  }
  if (cache.size >= MAX_ITEMS) {
    evictLeastRecentlyUsed();
  }
  cache.set(key, entry);
  cacheStats.sets++;
};

export const generateKey = (data: any): string => JSON.stringify(data);

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
  let expiredCount = 0;
  let activeCount = 0;

  for (const [, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      expiredCount++;
    } else {
      activeCount++;
    }
  }

  return {
    size: cache.size,
    activeCount,
    expiredCount,
    maxItems: MAX_ITEMS,
    defaultTTLms: DEFAULT_TTL_MS,
    stats: { ...cacheStats },
  };
};
