import { describe, expect, it } from 'vitest';
import { createConnector } from '../connector';
import { createFlags } from '../flags';
import type { FlagConnection } from '../types';

/** A stand-in Redis: `SET … EX` stores a key with its TTL, `EXISTS` counts the keys present. */
const fakeRedis = () => {
  const keys = new Map<string, { value: string; ttlSeconds: number }>();
  let status = 'wait';
  const connection: FlagConnection & { status: string; connect: () => Promise<void> } = {
    get status() {
      return status;
    },
    connect: async () => {
      status = 'ready';
    },
    set: async (key, value, _mode, ttlSeconds) => {
      if (status !== 'ready') throw new Error('Stream isn’t writeable');
      keys.set(key, { value, ttlSeconds });
      return 'OK';
    },
    exists: async (key) => {
      if (status !== 'ready') throw new Error('Stream isn’t writeable');
      return keys.has(key) ? 1 : 0;
    },
  };
  return { connection, keys };
};

const setup = () => {
  const redis = fakeRedis();
  const flags = createFlags({
    connection: redis.connection,
    connect: createConnector(redis.connection),
  });
  return { redis, flags };
};

describe('flags', () => {
  it('reads a flag as lowered until it is raised', async () => {
    const { flags } = setup();

    await expect(flags.isRaised('stream-cancel:a')).resolves.toBe(false);
    await flags.raise('stream-cancel:a', 60);
    await expect(flags.isRaised('stream-cancel:a')).resolves.toBe(true);
  });

  it('keeps flags apart by key', async () => {
    const { flags } = setup();

    await flags.raise('stream-cancel:a', 60);

    await expect(flags.isRaised('stream-cancel:b')).resolves.toBe(false);
  });

  it('raises a flag with its TTL, so it lowers itself once that passes', async () => {
    const { redis, flags } = setup();

    await flags.raise('stream-cancel:a', 600);

    expect(redis.keys.get('stream-cancel:a')?.ttlSeconds).toBe(600);
    redis.keys.delete('stream-cancel:a');
    await expect(flags.isRaised('stream-cancel:a')).resolves.toBe(false);
  });

  it('opens the main connection first, since it rejects commands until connected', async () => {
    const { redis, flags } = setup();

    await flags.isRaised('stream-cancel:a');

    expect(redis.connection.status).toBe('ready');
  });

  it('propagates a Redis failure rather than reading it as lowered', async () => {
    const { redis, flags } = setup();
    redis.connection.exists = async () => {
      throw new Error('redis down');
    };

    await expect(flags.isRaised('stream-cancel:a')).rejects.toThrow('redis down');
  });
});
