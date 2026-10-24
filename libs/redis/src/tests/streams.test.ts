import { describe, expect, it, vi } from 'vitest';
import { createConnector } from '../connector';
import { createStreams } from '../streams';
import type { StreamReadConnection, StreamWriteConnection, XReadReply } from '../types';

type Entry = [id: string, fields: string[]];

/**
 * A stand-in Redis holding streams in memory. `XADD` assigns increasing ids,
 * `XREAD … BLOCK` returns entries after the given id at once, or waits for the
 * next `XADD` up to the block time and then returns nil, as Redis does.
 */
const fakeRedis = () => {
  const streams = new Map<string, Entry[]>();
  const expiries = new Map<string, number>();
  const waiters = new Set<() => void>();
  let seq = 0;

  const after = (key: string, afterId: string, count: number): Entry[] => {
    const [ms, n] = afterId.split('-').map(Number);
    return (streams.get(key) ?? [])
      .filter(([id]) => {
        const [idMs, idN] = id.split('-').map(Number);
        return idMs! > ms! || (idMs === ms && idN! > (n ?? -1));
      })
      .slice(0, count);
  };

  // Like the lib's main connection: lazy, so a command before the first connect is rejected.
  let status = 'wait';
  const writer: StreamWriteConnection & { status: string; connect: () => Promise<void> } = {
    get status() {
      return status;
    },
    connect: async () => {
      status = 'ready';
    },
    xadd: async (key, _id, field, value) => {
      if (status !== 'ready') throw new Error('Stream isn’t writeable');
      seq += 1;
      const id = `1700000000000-${seq}`;
      streams.set(key, [...(streams.get(key) ?? []), [id, [field, value]]]);
      for (const wake of waiters) wake();
      return id;
    },
    expire: async (key, seconds) => {
      if (status !== 'ready') throw new Error('Stream isn’t writeable');
      expiries.set(key, seconds);
      return 1;
    },
    exists: async (key) => {
      if (status !== 'ready') throw new Error('Stream isn’t writeable');
      return streams.has(key) ? 1 : 0;
    },
  };

  const readers: (StreamReadConnection & { closed: boolean })[] = [];

  const readerConnection = (): StreamReadConnection => {
    let closed = false;
    let abort: ((err: Error) => void) | undefined;
    const connection = {
      get closed() {
        return closed;
      },
      xread: (async (_c, count, _b, blockMs, _s, key, id) => {
        if (closed) throw new Error('Connection is closed.');
        const ready = after(key, id, count);
        if (ready.length > 0) return [[key, ready]];
        return new Promise<XReadReply>((resolve, reject) => {
          abort = reject;
          const timer = setTimeout(() => {
            waiters.delete(wake);
            resolve(null);
          }, blockMs);
          const wake = () => {
            const fresh = after(key, id, count);
            if (fresh.length === 0) return;
            clearTimeout(timer);
            waiters.delete(wake);
            resolve([[key, fresh]]);
          };
          waiters.add(wake);
        });
      }) as StreamReadConnection['xread'],
      disconnect: () => {
        closed = true;
        abort?.(new Error('Connection is closed.'));
      },
    };
    readers.push(connection);
    return connection;
  };

  return { writer, readerConnection, readers, expiries, streams };
};

const setup = () => {
  const redis = fakeRedis();
  const streams = createStreams({
    writer: redis.writer,
    connect: createConnector(redis.writer),
    readerConnection: redis.readerConnection,
  });
  return { redis, streams };
};

describe('streams', () => {
  it('reads every appended entry, in order, from the start', async () => {
    const { streams } = setup();
    const first = await streams.append('stream:a', 'one');
    const second = await streams.append('stream:a', 'two');

    const reader = streams.openReader();
    await expect(reader.read('stream:a', '0')).resolves.toEqual([
      { id: first, payload: 'one' },
      { id: second, payload: 'two' },
    ]);
  });

  it('reads only the entries after a given id', async () => {
    const { streams } = setup();
    const first = await streams.append('stream:a', 'one');
    const second = await streams.append('stream:a', 'two');

    const reader = streams.openReader();
    await expect(reader.read('stream:a', first)).resolves.toEqual([{ id: second, payload: 'two' }]);
  });

  it('keeps streams apart by key', async () => {
    const { streams } = setup();
    await streams.append('stream:a', 'for a');
    const forB = await streams.append('stream:b', 'for b');

    await expect(streams.openReader().read('stream:b', '0')).resolves.toEqual([
      { id: forB, payload: 'for b' },
    ]);
  });

  it('caps one read at `count` entries', async () => {
    const { streams } = setup();
    await streams.append('stream:a', 'one');
    await streams.append('stream:a', 'two');

    await expect(streams.openReader().read('stream:a', '0', { count: 1 })).resolves.toHaveLength(1);
  });

  it('waits for an entry appended while it blocks', async () => {
    const { streams } = setup();
    const reader = streams.openReader();

    const pending = reader.read('stream:a', '0', { blockMs: 1_000 });
    const id = await streams.append('stream:a', 'late');

    await expect(pending).resolves.toEqual([{ id, payload: 'late' }]);
  });

  it('returns no entries when the block times out', async () => {
    vi.useFakeTimers();
    try {
      const { streams } = setup();
      const pending = streams.openReader().read('stream:a', '0', { blockMs: 5_000 });
      await vi.advanceTimersByTimeAsync(5_000);
      await expect(pending).resolves.toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('gives each reader a dedicated connection, so one blocking read never holds up another', async () => {
    const { redis, streams } = setup();
    streams.openReader();
    streams.openReader();
    expect(redis.readers).toHaveLength(2);
  });

  it('closing a reader drops its connection and rejects the read in flight', async () => {
    const { redis, streams } = setup();
    const reader = streams.openReader();
    const pending = reader.read('stream:a', '0', { blockMs: 60_000 });

    reader.close();

    await expect(pending).rejects.toThrow('Connection is closed.');
    expect(redis.readers[0]!.closed).toBe(true);
  });

  it('opens the main connection before appending, since it rejects commands until connected', async () => {
    const { redis, streams } = setup();
    expect(redis.writer.status).toBe('wait');

    await streams.append('stream:a', 'one');

    expect(redis.writer.status).toBe('ready');
  });

  it('sets a TTL on a stream', async () => {
    const { redis, streams } = setup();
    await streams.append('stream:a', 'one');
    await streams.expire('stream:a', 3_600);
    expect(redis.expiries.get('stream:a')).toBe(3_600);
  });

  it('tells a stream that exists from one that never did or has expired', async () => {
    const { redis, streams } = setup();
    await streams.append('stream:a', 'one');

    await expect(streams.exists('stream:a')).resolves.toBe(true);
    await expect(streams.exists('stream:b')).resolves.toBe(false);
    redis.streams.delete('stream:a');
    await expect(streams.exists('stream:a')).resolves.toBe(false);
  });

  it('opens the main connection before checking a stream exists', async () => {
    const { redis, streams } = setup();

    await streams.exists('stream:a');

    expect(redis.writer.status).toBe('ready');
  });

  it('propagates a failed append rather than failing open', async () => {
    const { redis, streams } = setup();
    redis.writer.xadd = async () => {
      throw new Error('redis down');
    };
    await expect(streams.append('stream:a', 'one')).rejects.toThrow('redis down');
  });

  it('rejects an append Redis gave no id for', async () => {
    const { redis, streams } = setup();
    redis.writer.xadd = async () => null;
    await expect(streams.append('stream:a', 'one')).rejects.toThrow('returned no id');
  });

  it('reads an entry with no payload field as an empty payload', async () => {
    const { redis, streams } = setup();
    redis.streams.set('stream:a', [['1-1', ['other', 'x']]]);
    await expect(streams.openReader().read('stream:a', '0')).resolves.toEqual([
      { id: '1-1', payload: '' },
    ]);
  });
});
