import {
  buildKey,
  createRedis,
  streamCancelKey,
  streamEndedKey,
  streamKey,
} from '@nebula-chat/redis';
import type { RedisToolkit, StreamEntry } from '@nebula-chat/redis';
import { env } from '@backend/env';
import { logger } from '@backend/logger';

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

const activeStreamKey = (sessionId: string): string => buildKey('session-stream', sessionId);

/** Records `streamId` as the Session's latest reply, so a page reloaded mid-reply can re-attach. */
export const saveActiveStream = async (sessionId: string, streamId: string): Promise<void> => {
  await redis.connect();
  await redis.connection.set(activeStreamKey(sessionId), streamId, 'EX', STREAM_OWNER_TTL_SECONDS);
};

/** Whether the worker has given a reply stream its terminal event. Errors propagate. */
export const isStreamEnded = (streamId: string): Promise<boolean> =>
  redis.flags.isRaised(streamEndedKey(streamId));

/** The Session's reply still being produced, or `null` once its stream has ended. Errors propagate. */
export const findActiveStream = async (sessionId: string): Promise<string | null> => {
  await redis.connect();
  const streamId = await redis.connection.get(activeStreamKey(sessionId));
  if (streamId === null || (await isStreamEnded(streamId))) return null;
  return streamId;
};

/**
 * Whether a reply stream ended and its TTL has since passed, leaving only the persisted Message.
 * A stream that does not exist yet but never ended is still queued, not expired.
 */
export const isStreamExpired = async (streamId: string): Promise<boolean> =>
  (await isStreamEnded(streamId)) && !(await redis.streams.exists(streamKey(streamId)));

/** Raises the flag the worker polls to stop producing a reply. Errors propagate. */
export const requestStreamCancel = (streamId: string): Promise<void> =>
  redis.flags.raise(streamCancelKey(streamId), env.STREAM_CANCEL_TTL_SECONDS);

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
