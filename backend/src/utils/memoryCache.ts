import type { CacheEntry } from '@backend/types/chace.types';

const cache = new Map<string, CacheEntry>();

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const MAX_ITEMS = 1000;

const markAsUsed = (key: string, entry: CacheEntry) => {
  cache.delete(key);
  cache.set(key, entry);
};

const evictLeastRecentlyUsed = () => {
  const oldestKey = cache.keys().next().value;
  if (oldestKey !== undefined) {
    cache.delete(oldestKey);
  }
};

export const getFromCache = (key: string): string | undefined => {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
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
    return;
  }
  if (cache.size >= MAX_ITEMS) {
    evictLeastRecentlyUsed();
  }
  cache.set(key, entry);
};

export const generateKey = (data: any): string => JSON.stringify(data);

setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now > entry.expiresAt) {
        cache.delete(key);
      }
    }
  },
  30 * 60 * 1000,
).unref();
