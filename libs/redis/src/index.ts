// Factory + toolkit
export { createRedis } from './factory';
export type { RedisToolkit } from './factory';

// Cache primitive
export type { RedisCache } from './cache';

// Auth storage primitive (better-auth SecondaryStorage; first consumer of the
// reserved storage seam, M-6)
export type { AuthStore } from './authStore';

// Pub/sub primitive (fire-and-forget broadcast)
export type { RedisPubSub } from './pubsub';

// Key helpers (the lib owns the key/hash scheme)
export { hashText, buildKey, authKey, AUTH_KEY_PREFIX } from './keys';

// Config
export type {
  RedisConfig,
  CacheOptions,
  CacheConnection,
  AuthStoreConnection,
  PublishConnection,
  SubscribeConnection,
} from './types';
