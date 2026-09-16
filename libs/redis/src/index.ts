// Factory + toolkit
export { createRedis } from './factory';
export type { RedisToolkit } from './factory';

// Cache primitive
export type { RedisCache } from './cache';

// Key helpers (the lib owns the key/hash scheme)
export { hashText, buildKey } from './keys';

// Config
export type { RedisConfig, CacheOptions, CacheConnection } from './types';
