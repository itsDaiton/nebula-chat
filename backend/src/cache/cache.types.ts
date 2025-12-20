import type { z } from 'zod';
import type {
  cacheStatsResponseSchema,
  cacheKeysResponseSchema,
  cacheClearResponseSchema,
  cacheHealthResponseSchema,
  redisStatsSchema,
  baseRedisStatsSchema,
  cacheStatsSchema,
} from './cache.validation';

export interface CachedStreamData {
  tokens: string;
  usageData?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
export type BaseRedisStats = z.infer<typeof baseRedisStatsSchema>;
export type RedisStats = z.infer<typeof redisStatsSchema>;
export type CacheStats = z.infer<typeof cacheStatsSchema>;

export type CacheStatsResponse = z.infer<typeof cacheStatsResponseSchema>;
export type CacheKeysResponse = z.infer<typeof cacheKeysResponseSchema>;
export type CacheClearResponse = z.infer<typeof cacheClearResponseSchema>;
export type CacheHealthResponse = z.infer<typeof cacheHealthResponseSchema>;
