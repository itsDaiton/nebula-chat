import type { Redis } from 'ioredis';
import type { Logger } from '@nebula-chat/otel';

export type CacheOptions = {
  /** Default TTL in seconds applied by `set()` when no per-call TTL is given. Default: 600 (10 min). */
  defaultTtlSeconds?: number;
};

export type RedisConfig = {
  /** Redis connection string */
  redisUrl: string;
  /**
   * Injected `@nebula-chat/otel` logger, used via a `nebula.component: redis` child so `LOG_LEVEL_OVERRIDES=redis=…` applies; pass one with no component bound.
   */
  logger: Logger;
  cache?: CacheOptions;
};

/**
 * The subset of ioredis the cache calls, so tests can use a plain fake and a real `Redis` satisfies it structurally.
 */
export type CacheConnection = Pick<Redis, 'get' | 'del' | 'keys'> & {
  set(key: string, value: string, expiryMode: 'EX', ttlSeconds: number): Promise<unknown>;
};

/**
 * The subset of a lazily-connecting ioredis client `createConnector` drives:
 * `status` is `'wait'` until the first `connect()`.
 */
export type LazyConnection = Pick<Redis, 'connect'> & { readonly status: string };

/**
 * The subset of ioredis the `authStore` calls (`getdel`, `incr` + `expire` for TTL-on-create counters, `set` with and without `EX`).
 */
export type AuthStoreConnection = Pick<Redis, 'get' | 'del' | 'getdel' | 'incr' | 'expire'> & {
  set(key: string, value: string, expiryMode: 'EX', ttlSeconds: number): Promise<unknown>;
  set(key: string, value: string): Promise<unknown>;
};

/** The subset of the ioredis client the pub/sub primitive publishes with. */
export type PublishConnection = Pick<Redis, 'publish'>;

/**
 * The subset of an ioredis client in subscriber mode that the pub/sub primitive
 * calls: it subscribes to and unsubscribes from channels, and listens for their messages.
 */
export type SubscribeConnection = Pick<Redis, 'subscribe' | 'unsubscribe'> & {
  on(event: 'message', listener: (channel: string, message: string) => void): unknown;
};

/**
 * The events of an ioredis client that `logConnectionErrors` listens to: `error`
 * on every failed (re)connect, `ready` once the connection can take commands.
 */
export type ConnectionEvents = {
  on(event: 'error', listener: (error: Error) => void): unknown;
  on(event: 'ready', listener: () => void): unknown;
};

/** The subset of the ioredis client the streams primitive appends and expires with. */
export type StreamWriteConnection = {
  xadd(key: string, id: '*', field: string, value: string): Promise<string | null>;
  expire(key: string, seconds: number): Promise<number>;
  exists(key: string): Promise<number>;
};

/** A raw `XREAD` reply: per stream, its key and `[id, [field, value, …]]` entries; nil on timeout. */
export type XReadReply = [key: string, entries: [id: string, fields: string[]][]][] | null;

/** The subset of a dedicated ioredis connection a stream reader calls. */
export type StreamReadConnection = {
  xread(
    countToken: 'COUNT',
    count: number,
    blockToken: 'BLOCK',
    blockMs: number,
    streamsToken: 'STREAMS',
    key: string,
    id: string,
  ): Promise<XReadReply>;
  disconnect(): void;
};

/** The subset of the ioredis client the flags primitive raises and checks flags with. */
export type FlagConnection = {
  set(key: string, value: string, expiryMode: 'EX', ttlSeconds: number): Promise<unknown>;
  exists(key: string): Promise<number>;
};
