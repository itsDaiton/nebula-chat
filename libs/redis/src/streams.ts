import type { StreamReadConnection, StreamWriteConnection } from './types';

/** One stream entry: its Redis-assigned id (`<ms>-<seq>`) and the payload appended with it. */
export type StreamEntry = { id: string; payload: string };

export type StreamReadOptions = {
  /** How long to wait for a new entry before returning none. Default 5 000 ms. */
  blockMs?: number;
  /** The most entries one read returns. Default 100. */
  count?: number;
};

/**
 * Reads streams over a connection of its own: a blocking `XREAD` ties its
 * connection up until an entry arrives or the block times out.
 */
export type StreamReader = {
  /** Entries of `key` after `afterId` (`'0'` for the start), waiting up to `blockMs` for one. */
  read(key: string, afterId: string, options?: StreamReadOptions): Promise<StreamEntry[]>;
  /** Drops the connection at once; a read in flight rejects. */
  close(): void;
};

/**
 * Redis Streams: an append-only log per key that readers tail from any offset,
 * so a reader that connects late still gets every entry (unlike pub/sub).
 * Errors propagate: a stream carries data, so nothing here fails open.
 */
export type RedisStreams = {
  /** Appends `payload` to `key` and resolves to the new entry's id. */
  append(key: string, payload: string): Promise<string>;
  /** Deletes `key` once `ttlSeconds` have passed. */
  expire(key: string, ttlSeconds: number): Promise<void>;
  /** Whether `key` holds a stream: false before its first append and once it has expired. */
  exists(key: string): Promise<boolean>;
  /** A reader on a dedicated connection; close it when done. */
  openReader(): StreamReader;
};

type StreamsDeps = {
  writer: StreamWriteConnection;
  /** Opens `writer` if it has never connected (the manager's shared `connect`). */
  connect: () => Promise<void>;
  /** Opens a dedicated connection for one reader. */
  readerConnection: () => StreamReadConnection;
};

// Every entry holds one field; the payload's shape is the caller's contract.
const PAYLOAD_FIELD = 'payload';

const DEFAULT_BLOCK_MS = 5_000;
const DEFAULT_COUNT = 100;

const toEntry = ([id, fields]: [string, string[]]): StreamEntry => {
  const index = fields.indexOf(PAYLOAD_FIELD);
  return { id, payload: index === -1 ? '' : (fields[index + 1] ?? '') };
};

const createReader = (connection: StreamReadConnection): StreamReader => ({
  read: async (key, afterId, { blockMs = DEFAULT_BLOCK_MS, count = DEFAULT_COUNT } = {}) => {
    const result = await connection.xread(
      'COUNT',
      count,
      'BLOCK',
      blockMs,
      'STREAMS',
      key,
      afterId,
    );
    // A block that times out returns nil; one key was asked for, so one stream comes back.
    return result?.[0]?.[1].map(toEntry) ?? [];
  },
  close: () => connection.disconnect(),
});

export const createStreams = ({
  writer,
  connect,
  readerConnection,
}: StreamsDeps): RedisStreams => ({
  append: async (key, payload) => {
    // The main connection rejects a command sent before its first connect is ready.
    await connect();
    const id = await writer.xadd(key, '*', PAYLOAD_FIELD, payload);
    if (id === null) throw new Error(`XADD to ${key} returned no id`);
    return id;
  },
  expire: async (key, ttlSeconds) => {
    await connect();
    await writer.expire(key, ttlSeconds);
  },
  exists: async (key) => {
    await connect();
    return (await writer.exists(key)) > 0;
  },
  openReader: () => createReader(readerConnection()),
});
