import { z } from 'zod';

const baseRedisStatsSchema = z.object({
  hits: z.number(),
  misses: z.number(),
  expired: z.number(),
  evictions: z.number(),
  sets: z.number(),
  lastEvictedKey: z.string().nullable(),
  lastSetKey: z.string().nullable(),
  lastHitKey: z.string().nullable(),
});

export const redisStatsSchema = baseRedisStatsSchema.extend({
  hitRate: z.number(),
  missRate: z.number(),
  expiredRate: z.number(),
  averageTTLremaining: z.number(),
  oldestTTL: z.number(),
  newestTTL: z.number(),
  isHealthy: z.boolean(),
});

export const cacheStatsSchema = z.object({
  size: z.number(),
  activeItems: z.number(),
  expiredItems: z.number(),
  maxItems: z.number(),
  defaultTtlMs: z.number(),
  stats: redisStatsSchema,
});

export const cacheStatsResponseSchema = z.object({
  success: z.boolean(),
  stats: cacheStatsSchema,
});

export const cacheKeysResponseSchema = z.object({
  success: z.boolean(),
  count: z.number(),
  keys: z.array(z.string()),
});

export const cacheClearResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const cacheHealthResponseSchema = z.object({
  status: z.literal('ok'),
});

export { baseRedisStatsSchema };
