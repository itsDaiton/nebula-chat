import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cacheConfig } from '@backend/cache/cache.config';
import { createTestApp } from '@backend/test/app';

vi.mock('@backend/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));

vi.mock('@backend/cache/cache.service', () => ({
  cacheService: {
    getCacheStats: vi.fn(),
    getRecentKeys: vi.fn(),
    clearCache: vi.fn(),
    healthCheck: vi.fn(),
  },
}));

import { cacheService } from '@backend/cache/cache.service';

const cache = vi.mocked(cacheService);

const someStats = {
  size: 2,
  activeItems: 2,
  expiredItems: 0,
  maxItems: cacheConfig.maxItems,
  defaultTtlMs: cacheConfig.defaultTTL,
  stats: {
    hits: 3,
    misses: 1,
    expired: 0,
    evictions: 0,
    sets: 4,
    lastEvictedKey: null,
    lastSetKey: 'k',
    lastHitKey: 'k',
    hitRate: 0.75,
    missRate: 0.25,
    expiredRate: 0,
    averageTTLremaining: 0,
    oldestTTL: 0,
    newestTTL: 0,
    isHealthy: true,
  },
};

let app: FastifyInstance;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/cache/stats', () => {
  it('returns the cache statistics', async () => {
    cache.getCacheStats.mockResolvedValue(someStats);

    const res = await app.inject({ method: 'GET', url: '/api/cache/stats' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ success: true, stats: { size: 2 } });
  });

  it('surfaces a cache failure as a 500', async () => {
    cache.getCacheStats.mockRejectedValue(new Error('redis unavailable'));

    const res = await app.inject({ method: 'GET', url: '/api/cache/stats' });

    expect(res.statusCode).toBe(500);
    expect(res.json().success).toBe(false);
  });
});

describe('GET /api/cache/keys', () => {
  it('returns the tracked keys with a count', async () => {
    cache.getRecentKeys.mockResolvedValue(['a', 'b', 'c']);

    const res = await app.inject({ method: 'GET', url: '/api/cache/keys' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ success: true, count: 3, keys: ['a', 'b', 'c'] });
  });

  it('requests at most the configured key limit', async () => {
    cache.getRecentKeys.mockResolvedValue([]);

    await app.inject({ method: 'GET', url: '/api/cache/keys' });

    expect(cache.getRecentKeys).toHaveBeenCalledWith(cacheConfig.keyLimit);
  });

  it('reports a count of zero for an empty cache', async () => {
    cache.getRecentKeys.mockResolvedValue([]);

    const res = await app.inject({ method: 'GET', url: '/api/cache/keys' });

    expect(res.json()).toMatchObject({ count: 0, keys: [] });
  });
});

describe('DELETE /api/cache/clear', () => {
  it('clears the cache and confirms', async () => {
    cache.clearCache.mockResolvedValue(undefined);

    const res = await app.inject({ method: 'DELETE', url: '/api/cache/clear' });

    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
    expect(cache.clearCache).toHaveBeenCalled();
  });

  it('surfaces a clear failure as a 500', async () => {
    cache.clearCache.mockRejectedValue(new Error('redis unavailable'));

    const res = await app.inject({ method: 'DELETE', url: '/api/cache/clear' });

    expect(res.statusCode).toBe(500);
  });

  it('is not reachable with GET', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/cache/clear' });

    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/cache/health', () => {
  it('reports cache health', async () => {
    cache.healthCheck.mockResolvedValue({ status: 'ok' });

    const res = await app.inject({ method: 'GET', url: '/api/cache/health' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });
});
