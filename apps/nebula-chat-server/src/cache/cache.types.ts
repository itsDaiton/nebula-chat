import type { z } from 'zod';
import type { baseRedisStatsSchema, cacheStatsSchema } from './cache.validation';

export type CachedStreamData = {
  tokens: string;
  usageData?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};
export type BaseRedisStats = z.infer<typeof baseRedisStatsSchema>;
export type CacheStats = z.infer<typeof cacheStatsSchema>;
