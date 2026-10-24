import { describe, it, expect, vi, beforeEach } from 'vitest';
import type * as RedisLib from '@nebula-chat/redis';

// `vi.mock` is hoisted above the module body, so the factory's dependencies must be hoisted too.
const toolkit = vi.hoisted(() => ({
  connect: vi.fn(async () => undefined),
  close: vi.fn(async () => undefined),
  connection: { set: vi.fn(async () => 'OK'), get: vi.fn(async () => null as string | null) },
  reader: { read: vi.fn(async () => []), close: vi.fn() },
}));

// Keep the real key helpers but stub the factory, so importing @server/redis opens no connection.
vi.mock('@nebula-chat/redis', async (importActual) => {
  const actual = await importActual<typeof RedisLib>();
  return {
    ...actual,
    createRedis: vi.fn(() => ({
      connect: toolkit.connect,
      close: toolkit.close,
      connection: toolkit.connection,
      streams: { openReader: () => toolkit.reader },
    })),
  };
});

import { closeRedis, findStreamOwner, openReplyStream, saveStreamOwner } from '@server/redis';

const STREAM_ID = '44444444-4444-4444-8444-444444444444';

beforeEach(() => {
  vi.clearAllMocks();
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
