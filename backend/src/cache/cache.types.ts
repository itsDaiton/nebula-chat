export interface CachedStreamData {
  tokens: string;
  usageData?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface RedisStats {
  hits: number;
  misses: number;
  expired: number;
  evictions: number;
  sets: number;
  lastEvictedKey: string | null;
  lastSetKey: string | null;
  lastHitKey: string | null;
}

export interface CacheStats {
  size: number;
  activeItems: number;
  expiredItems: number;
  maxItems: number;
  defaultTtlMs: number;
  stats: {
    hits: number;
    misses: number;
    expired: number;
    evictions: number;
    sets: number;
    lastEvictedKey: string | null;
    lastSetKey: string | null;
    lastHitKey: string | null;
    hitRate: number;
    missRate: number;
    expiredRate: number;
    averageTTLremaining: number;
    oldestTTL: number;
    newestTTL: number;
    isHealty: boolean;
  };
}
