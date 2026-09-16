import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('@nebula-chat/redis');

const hitCounter = meter.createCounter('nebula_redis_cache_hits', {
  description: 'Number of cache reads served from Redis',
});
const missCounter = meter.createCounter('nebula_redis_cache_misses', {
  description: 'Number of cache reads that missed or failed open',
});

export const recordCacheHit = (): void => hitCounter.add(1);
export const recordCacheMiss = (): void => missCounter.add(1);
