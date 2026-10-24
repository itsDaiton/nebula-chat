import { describe, it, expect, vi, beforeEach } from 'vitest';
import type * as RedisLib from '@nebula-chat/redis';

// `vi.mock` is hoisted above the module body, so the factory's dependencies must be hoisted too.
const toolkit = vi.hoisted(() => ({
  connect: vi.fn(async () => undefined),
  close: vi.fn(async () => undefined),
  connection: { set: vi.fn(async () => 'OK'), get: vi.fn(async () => null as string | null) },
  reader: { read: vi.fn(async () => []), close: vi.fn() },
  // Flags and stream keys held in memory, as the real toolkit's primitives would.
  flags: new Map<string, number>(),
  streamKeys: new Set<string>(),
}));

// Keep the real key helpers but stub the factory, so importing @backend/redis opens no connection.
vi.mock('@nebula-chat/redis', async (importActual) => {
  const actual = await importActual<typeof RedisLib>();
  return {
    ...actual,
    createRedis: vi.fn(() => ({
      connect: toolkit.connect,
      close: toolkit.close,
      connection: toolkit.connection,
      streams: {
        openReader: () => toolkit.reader,
        exists: async (key: string) => toolkit.streamKeys.has(key),
      },
      flags: {
        raise: async (key: string, ttlSeconds: number) => {
          toolkit.flags.set(key, ttlSeconds);
        },
        isRaised: async (key: string) => toolkit.flags.has(key),
      },
    })),
  };
});

import {
  closeRedis,
  findActiveStream,
  findStreamOwner,
  isStreamEnded,
  isStreamExpired,
  openReplyStream,
  requestStreamCancel,
  saveActiveStream,
  saveStreamOwner,
} from '@backend/redis';

const STREAM_ID = '44444444-4444-4444-8444-444444444444';
const SESSION_ID = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  vi.clearAllMocks();
  toolkit.flags.clear();
  toolkit.streamKeys.clear();
});

describe('stream owners', () => {
  it('records the owner with a TTL, after opening the connection', async () => {
    await saveStreamOwner(STREAM_ID, 'user-1');

    expect(toolkit.connect).toHaveBeenCalled();
    expect(toolkit.connection.set).toHaveBeenCalledWith(
      `stream-owner:${STREAM_ID}`,
      'user-1',
      'EX',
      86_400,
    );
  });

  it('reads the owner back from the same key', async () => {
    toolkit.connection.get.mockResolvedValueOnce('user-1');

    await expect(findStreamOwner(STREAM_ID)).resolves.toBe('user-1');
    expect(toolkit.connection.get).toHaveBeenCalledWith(`stream-owner:${STREAM_ID}`);
  });

  it('propagates a Redis failure rather than reading it as no owner', async () => {
    toolkit.connection.get.mockRejectedValueOnce(new Error('redis down'));

    await expect(findStreamOwner(STREAM_ID)).rejects.toThrow('redis down');
  });
});

describe("a Session's in-flight stream", () => {
  it('records the stream under the Session for a day', async () => {
    await saveActiveStream(SESSION_ID, STREAM_ID);

    expect(toolkit.connection.set).toHaveBeenCalledWith(
      `session-stream:${SESSION_ID}`,
      STREAM_ID,
      'EX',
      86_400,
    );
  });

  it('names the stream while it has not ended', async () => {
    toolkit.connection.get.mockResolvedValueOnce(STREAM_ID);

    await expect(findActiveStream(SESSION_ID)).resolves.toBe(STREAM_ID);
    expect(toolkit.connection.get).toHaveBeenCalledWith(`session-stream:${SESSION_ID}`);
  });

  it('names none once the stream has ended, or when none was recorded', async () => {
    await expect(findActiveStream(SESSION_ID)).resolves.toBeNull();

    toolkit.connection.get.mockResolvedValueOnce(STREAM_ID);
    toolkit.flags.set(`stream-ended:${STREAM_ID}`, 86_400);
    await expect(findActiveStream(SESSION_ID)).resolves.toBeNull();
  });
});

describe('stream expiry', () => {
  it('reads a stream that ended and is gone as expired', async () => {
    toolkit.flags.set(`stream-ended:${STREAM_ID}`, 86_400);

    await expect(isStreamEnded(STREAM_ID)).resolves.toBe(true);
    await expect(isStreamExpired(STREAM_ID)).resolves.toBe(true);
  });

  it('reads a stream that ended but is still kept as not expired, so it can be replayed', async () => {
    toolkit.flags.set(`stream-ended:${STREAM_ID}`, 86_400);
    toolkit.streamKeys.add(`stream:${STREAM_ID}`);

    await expect(isStreamExpired(STREAM_ID)).resolves.toBe(false);
  });

  it('reads a stream that never ended as not expired, though it does not exist yet', async () => {
    await expect(isStreamExpired(STREAM_ID)).resolves.toBe(false);
  });
});

describe('requestStreamCancel', () => {
  it("raises the stream's cancel flag with the configured TTL", async () => {
    await requestStreamCancel(STREAM_ID);

    expect(toolkit.flags.get(`stream-cancel:${STREAM_ID}`)).toBe(900);
  });
});

describe('openReplyStream', () => {
  it("reads the reply's stream key from the given offset, blocking for the given time", async () => {
    const reader = openReplyStream(STREAM_ID);
    await reader.read('1-1', 15_000);

    expect(toolkit.reader.read).toHaveBeenCalledWith(`stream:${STREAM_ID}`, '1-1', {
      blockMs: 15_000,
    });
  });

  it('closes its dedicated connection', () => {
    openReplyStream(STREAM_ID).close();

    expect(toolkit.reader.close).toHaveBeenCalled();
  });
});

describe('closeRedis', () => {
  it('closes the toolkit', async () => {
    await closeRedis();

    expect(toolkit.close).toHaveBeenCalled();
  });
});
