import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cacheConfig } from '@backend/cache/cache.config';
import type { CreateChatStreamDTO } from '@backend/modules/chat/chat.types';

/** In-memory stand-in for the subset of the redis client the service uses. */
const createFakeRedis = () => {
  const strings = new Map<string, string>();
  const lists = new Map<string, string[]>();

  return {
    strings,
    lists,
    get: vi.fn(async (key: string) => strings.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      strings.set(key, value);
      return 'OK';
    }),
    setEx: vi.fn(async (key: string, _ttlSeconds: number, value: string) => {
      strings.set(key, value);
      return 'OK';
    }),
    lPush: vi.fn(async (key: string, value: string) => {
      const list = lists.get(key) ?? [];
      list.unshift(value);
      lists.set(key, list);
      return list.length;
    }),
    rPop: vi.fn(async (key: string) => lists.get(key)?.pop() ?? null),
    lLen: vi.fn(async (key: string) => lists.get(key)?.length ?? 0),
    lRange: vi.fn(async (key: string, start: number, stop: number) => {
      const list = lists.get(key) ?? [];
      return stop === -1 ? list.slice(start) : list.slice(start, stop + 1);
    }),
    del: vi.fn(async (key: string | string[]) => {
      const keys = Array.isArray(key) ? key : [key];
      for (const k of keys) {
        strings.delete(k);
        lists.delete(k);
      }
      return keys.length;
    }),
  };
};

/**
 * One instance for the whole file: cache.service caches the client it gets from
 * createRedisClient in a module-level variable and only re-fetches when the
 * connection drops, so swapping the object per test would leave the service
 * reading a stale fake. State is cleared between tests instead.
 */
const fakeRedis = createFakeRedis();

vi.mock('@backend/cache/cache.client', () => ({
  createRedisClient: vi.fn(async () => fakeRedis),
  isRedisConnected: vi.fn(() => true),
  closeRedisClient: vi.fn(async () => undefined),
}));

vi.mock('@backend/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { closeRedisClient } from '@backend/cache/cache.client';
import { cacheService } from '@backend/cache/cache.service';

const streamRequest = (overrides: Partial<CreateChatStreamDTO> = {}) =>
  ({
    model: 'gpt-4o-mini',
    conversationId: '11111111-1111-4111-8111-111111111111',
    messages: [
      { role: 'user', content: 'first question' },
      { role: 'assistant', content: 'an answer' },
      { role: 'user', content: 'the latest question' },
    ],
    ...overrides,
  }) as CreateChatStreamDTO;

const readStats = () => JSON.parse(fakeRedis.strings.get(cacheConfig.statsKey) ?? '{}');

beforeEach(() => {
  fakeRedis.strings.clear();
  fakeRedis.lists.clear();
  vi.clearAllMocks();
});

describe('generateKey', () => {
  it('is deterministic for identical input', () => {
    expect(cacheService.generateKey(streamRequest())).toBe(
      cacheService.generateKey(streamRequest()),
    );
  });

  it('keys on the most recent user message, not the whole transcript', () => {
    const a = cacheService.generateKey(streamRequest());
    const b = cacheService.generateKey(
      streamRequest({
        messages: [
          { role: 'user', content: 'a completely different opening' },
          { role: 'user', content: 'the latest question' },
        ],
      }),
    );

    expect(a).toBe(b);
  });

  it('changes when the latest user prompt changes', () => {
    const a = cacheService.generateKey(streamRequest());
    const b = cacheService.generateKey(
      streamRequest({
        messages: [{ role: 'user', content: 'something else entirely' }],
      }),
    );

    expect(a).not.toBe(b);
  });

  it('separates entries by model, so a model switch cannot replay another cache', () => {
    const a = cacheService.generateKey(streamRequest({ model: 'gpt-4o-mini' }));
    const b = cacheService.generateKey(streamRequest({ model: 'gpt-4o' }));

    expect(a).not.toBe(b);
  });

  it('separates entries by conversation', () => {
    const a = cacheService.generateKey(streamRequest());
    const b = cacheService.generateKey(
      streamRequest({ conversationId: '22222222-2222-4222-8222-222222222222' }),
    );

    expect(a).not.toBe(b);
  });

  it("falls back to 'default' when no conversation id is supplied", () => {
    expect(cacheService.generateKey(streamRequest({ conversationId: undefined }))).toContain(
      'conversation:default:',
    );
  });

  it('hashes the prompt rather than embedding it in the key', () => {
    const key = cacheService.generateKey(streamRequest());

    expect(key).not.toContain('the latest question');
    expect(key).toMatch(/prompt:[0-9a-f]{16}$/);
  });

  it('handles a transcript with no user message at all', () => {
    expect(() =>
      cacheService.generateKey(
        streamRequest({ messages: [{ role: 'assistant', content: 'orphan' }] }),
      ),
    ).not.toThrow();
  });

  it('does not mutate the caller’s messages array while finding the last turn', () => {
    const request = streamRequest();
    const before = [...request.messages];

    cacheService.generateKey(request);

    expect(request.messages).toEqual(before);
  });
});

describe('getFromCache', () => {
  it('returns null and counts a miss when the key is absent', async () => {
    const result = await cacheService.getFromCache('missing-key');

    expect(result).toBeNull();
    expect(readStats().misses).toBe(1);
  });

  it('returns the parsed entry and counts a hit', async () => {
    fakeRedis.strings.set('k', JSON.stringify({ tokens: 'hello' }));

    const result = await cacheService.getFromCache('k');

    expect(result).toEqual({ tokens: 'hello' });
    expect(readStats().hits).toBe(1);
    expect(readStats().lastHitKey).toBe('k');
  });

  it('round-trips usage data alongside the tokens', async () => {
    const usageData = { promptTokens: 10, completionTokens: 5, totalTokens: 15 };
    fakeRedis.strings.set('k', JSON.stringify({ tokens: 'hi', usageData }));

    expect(await cacheService.getFromCache('k')).toEqual({ tokens: 'hi', usageData });
  });

  it('fails open and counts a miss when Redis throws', async () => {
    fakeRedis.get.mockRejectedValueOnce(new Error('connection reset'));

    await expect(cacheService.getFromCache('k')).resolves.toBeNull();
  });

  it('fails open when the stored value is not valid JSON', async () => {
    fakeRedis.strings.set('k', 'not json at all');

    await expect(cacheService.getFromCache('k')).resolves.toBeNull();
  });
});

describe('saveToCache', () => {
  it('stores the entry and records the set', async () => {
    await cacheService.saveToCache('k', 'streamed tokens');

    expect(JSON.parse(fakeRedis.strings.get('k') ?? '{}')).toEqual({ tokens: 'streamed tokens' });
    expect(readStats().sets).toBe(1);
    expect(readStats().lastSetKey).toBe('k');
  });

  it('converts the TTL from milliseconds to seconds for setEx', async () => {
    await cacheService.saveToCache('k', 'tokens', undefined, 30_000);

    expect(fakeRedis.setEx).toHaveBeenCalledWith('k', 30, expect.any(String));
  });

  it('applies the configured default TTL when none is given', async () => {
    await cacheService.saveToCache('k', 'tokens');

    expect(fakeRedis.setEx).toHaveBeenCalledWith(
      'k',
      Math.floor(cacheConfig.defaultTTL / 1000),
      expect.any(String),
    );
  });

  it('persists usage data when supplied', async () => {
    const usageData = { promptTokens: 1, completionTokens: 2, totalTokens: 3 };

    await cacheService.saveToCache('k', 'tokens', usageData);

    expect(JSON.parse(fakeRedis.strings.get('k') ?? '{}').usageData).toEqual(usageData);
  });

  it('omits usageData entirely when not supplied', async () => {
    await cacheService.saveToCache('k', 'tokens');

    expect(JSON.parse(fakeRedis.strings.get('k') ?? '{}')).not.toHaveProperty('usageData');
  });

  it('tracks the key in the recency list', async () => {
    await cacheService.saveToCache('k', 'tokens');

    expect(fakeRedis.lists.get(cacheConfig.keysList)).toContain('k');
  });

  it('evicts the oldest keys once the list exceeds maxItems', async () => {
    // Pre-fill one over the cap so a single save triggers exactly one eviction.
    const existing = Array.from({ length: cacheConfig.maxItems }, (_, i) => `old-${i}`);
    fakeRedis.lists.set(cacheConfig.keysList, [...existing]);

    await cacheService.saveToCache('newest', 'tokens');

    expect(fakeRedis.lists.get(cacheConfig.keysList)).toHaveLength(cacheConfig.maxItems);
    expect(readStats().evictions).toBe(1);
    expect(readStats().lastEvictedKey).toBe(`old-${cacheConfig.maxItems - 1}`);
  });

  it('evicts in FIFO order, dropping the oldest entry first', async () => {
    const existing = Array.from({ length: cacheConfig.maxItems }, (_, i) => `old-${i}`);
    fakeRedis.lists.set(cacheConfig.keysList, [...existing]);
    fakeRedis.strings.set(`old-${cacheConfig.maxItems - 1}`, 'stale value');

    await cacheService.saveToCache('newest', 'tokens');

    expect(fakeRedis.strings.has(`old-${cacheConfig.maxItems - 1}`)).toBe(false);
  });

  it('records no eviction while the list is within the cap', async () => {
    await cacheService.saveToCache('k', 'tokens');

    expect(readStats().evictions).toBe(0);
  });

  it('fails open when Redis rejects the write', async () => {
    fakeRedis.setEx.mockRejectedValueOnce(new Error('disk full'));

    await expect(cacheService.saveToCache('k', 'tokens')).resolves.toBeUndefined();
  });
});

describe('getCacheStats', () => {
  it('reports zero rates when nothing has been requested yet', async () => {
    const stats = await cacheService.getCacheStats();

    expect(stats.stats.hitRate).toBe(0);
    expect(stats.stats.missRate).toBe(0);
    expect(stats.stats.expiredRate).toBe(0);
  });

  it('derives hit and miss rates from the recorded totals', async () => {
    fakeRedis.strings.set(
      cacheConfig.statsKey,
      JSON.stringify({
        hits: 3,
        misses: 1,
        expired: 0,
        evictions: 0,
        sets: 0,
        lastEvictedKey: null,
        lastSetKey: null,
        lastHitKey: null,
      }),
    );

    const stats = await cacheService.getCacheStats();

    expect(stats.stats.hitRate).toBeCloseTo(0.75);
    expect(stats.stats.missRate).toBeCloseTo(0.25);
  });

  it('reports the tracked key count as the cache size', async () => {
    fakeRedis.lists.set(cacheConfig.keysList, ['a', 'b', 'c']);

    const stats = await cacheService.getCacheStats();

    expect(stats.size).toBe(3);
    expect(stats.activeItems).toBe(3);
  });

  it('considers a small cache healthy even with no hits', async () => {
    fakeRedis.lists.set(cacheConfig.keysList, ['a']);

    expect((await cacheService.getCacheStats()).stats.isHealthy).toBe(true);
  });

  it('considers a large cache with a poor hit rate unhealthy', async () => {
    fakeRedis.lists.set(
      cacheConfig.keysList,
      Array.from({ length: 60 }, (_, i) => `k-${i}`),
    );
    fakeRedis.strings.set(
      cacheConfig.statsKey,
      JSON.stringify({
        hits: 1,
        misses: 99,
        expired: 0,
        evictions: 0,
        sets: 0,
        lastEvictedKey: null,
        lastSetKey: null,
        lastHitKey: null,
      }),
    );

    expect((await cacheService.getCacheStats()).stats.isHealthy).toBe(false);
  });

  it('reports the configured limits', async () => {
    const stats = await cacheService.getCacheStats();

    expect(stats.maxItems).toBe(cacheConfig.maxItems);
    expect(stats.defaultTtlMs).toBe(cacheConfig.defaultTTL);
  });

  it('fails open to an empty, unhealthy report when Redis is down', async () => {
    fakeRedis.lLen.mockRejectedValueOnce(new Error('no connection'));

    const stats = await cacheService.getCacheStats();

    expect(stats.size).toBe(0);
    expect(stats.stats.isHealthy).toBe(false);
  });

  it('survives corrupt stats JSON by falling back to zeroed counters', async () => {
    fakeRedis.strings.set(cacheConfig.statsKey, '{{{ not json');

    expect((await cacheService.getCacheStats()).stats.hits).toBe(0);
  });
});

describe('clearCache', () => {
  it('removes every tracked entry plus the bookkeeping keys', async () => {
    fakeRedis.lists.set(cacheConfig.keysList, ['a', 'b']);
    fakeRedis.strings.set('a', 'x');
    fakeRedis.strings.set('b', 'y');
    fakeRedis.strings.set(cacheConfig.statsKey, '{}');

    await cacheService.clearCache();

    expect(fakeRedis.strings.has('a')).toBe(false);
    expect(fakeRedis.lists.has(cacheConfig.keysList)).toBe(false);
    expect(fakeRedis.strings.has(cacheConfig.statsKey)).toBe(false);
  });

  it('skips the bulk delete when there is nothing tracked', async () => {
    await cacheService.clearCache();

    expect(fakeRedis.del).not.toHaveBeenCalledWith([]);
  });

  it('raises a RedisCacheError when the clear fails', async () => {
    fakeRedis.lRange.mockRejectedValueOnce(new Error('connection lost'));

    await expect(cacheService.clearCache()).rejects.toThrow('Failed to clear cache');
  });
});

describe('getRecentKeys', () => {
  it('returns the most recent keys up to the requested limit', async () => {
    fakeRedis.lists.set(cacheConfig.keysList, ['k1', 'k2', 'k3', 'k4']);

    expect(await cacheService.getRecentKeys(2)).toEqual(['k1', 'k2']);
  });

  it('defaults to 20 keys', async () => {
    await cacheService.getRecentKeys();

    expect(fakeRedis.lRange).toHaveBeenCalledWith(cacheConfig.keysList, 0, 19);
  });

  it('fails open to an empty list when Redis is unreachable', async () => {
    fakeRedis.lRange.mockRejectedValueOnce(new Error('down'));

    expect(await cacheService.getRecentKeys()).toEqual([]);
  });
});

describe('healthCheck and closeCache', () => {
  it('reports ok', async () => {
    expect(await cacheService.healthCheck()).toEqual({ status: 'ok' });
  });

  it('closes the underlying Redis client', async () => {
    await cacheService.closeCache();

    expect(closeRedisClient).toHaveBeenCalled();
  });
});
