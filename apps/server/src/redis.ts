import { buildKey, createRedis, streamKey } from '@nebula-chat/redis';
import type { RedisToolkit, StreamEntry } from '@nebula-chat/redis';
import { env } from '@server/env';
import { logger } from '@server/logger';

/** The server's single Redis toolkit, mirroring `src/db.ts`. */
export const redis: RedisToolkit = createRedis({ redisUrl: env.REDIS_URL, logger });

export const closeRedis = (): Promise<void> => redis.close();

// Outlives the stream itself (an hour after `end`), and a job that waits for a sleeping worker.
const STREAM_OWNER_TTL_SECONDS = 24 * 60 * 60;

const streamOwnerKey = (streamId: string): string => buildKey('stream-owner', streamId);

// The assistant Message only exists once the worker finishes it, so a stream's owner is kept here,
// not in Postgres. Errors propagate.
export const saveStreamOwner = async (streamId: string, userId: string): Promise<void> => {
  // The main connection rejects a command sent before its first connect is ready.
  await redis.connect();
  await redis.connection.set(streamOwnerKey(streamId), userId, 'EX', STREAM_OWNER_TTL_SECONDS);
};

/** The User a reply stream belongs to, or `null` for an unknown or expired one. Errors propagate. */
export const findStreamOwner = async (streamId: string): Promise<string | null> => {
  await redis.connect();
  return redis.connection.get(streamOwnerKey(streamId));
};

/** Tails one reply stream over a dedicated connection; `close` drops it and rejects a read in flight. */
export type ReplyStreamReader = {
  read: (afterId: string, blockMs: number) => Promise<StreamEntry[]>;
  close: () => void;
};

export const openReplyStream = (streamId: string): ReplyStreamReader => {
  const reader = redis.streams.openReader();
  const key = streamKey(streamId);
  return {
    read: (afterId, blockMs) => reader.read(key, afterId, { blockMs }),
    close: () => reader.close(),
  };
};
