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

// Streams primitive (append-only logs tailed from an offset; reply delivery, ADR-0014)
export type { RedisStreams, StreamReader, StreamEntry, StreamReadOptions } from './streams';

// Flags primitive (short-lived markers with a TTL; reply cancel requests, ADR-0014)
export type { RedisFlags } from './flags';

// Key helpers (the lib owns the key/hash scheme)
export {
  hashText,
  buildKey,
  authKey,
  AUTH_KEY_PREFIX,
  streamKey,
  runCancelKey,
  streamCancelKey,
  streamEndedKey,
  REPLY_STREAM_RECORD_TTL_SECONDS,
} from './keys';

// Config
export type {
  RedisConfig,
  CacheOptions,
  CacheConnection,
  AuthStoreConnection,
  PublishConnection,
  SubscribeConnection,
  StreamWriteConnection,
  StreamReadConnection,
  XReadReply,
  FlagConnection,
} from './types';
