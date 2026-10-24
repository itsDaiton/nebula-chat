import type { FlagConnection } from './types';

/** Markers raised with a TTL. Errors propagate: a Redis failure never reads as "lowered". */
export type RedisFlags = {
  /** Raises `key` for `ttlSeconds`; raising it again restarts the TTL. */
  raise(key: string, ttlSeconds: number): Promise<void>;
  /** Whether `key` is raised and its TTL has not yet passed. */
  isRaised(key: string): Promise<boolean>;
};

type FlagsDeps = {
  connection: FlagConnection;
  /** Opens `connection` if it has never connected (the manager's shared `connect`). */
  connect: () => Promise<void>;
};

export const createFlags = ({ connection, connect }: FlagsDeps): RedisFlags => ({
  raise: async (key, ttlSeconds) => {
    // The main connection rejects a command sent before its first connect is ready.
    await connect();
    await connection.set(key, '1', 'EX', ttlSeconds);
  },
  isRaised: async (key) => {
    await connect();
    return (await connection.exists(key)) > 0;
  },
});
