import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GENERIC_ERROR_MESSAGE } from '@nebula-chat/errors';
import { createTestApp } from '@backend/test/app';
import { captureLogger, eventLines, LEVEL } from '@backend/test/logCapture';
import { replyStreams } from '@backend/test/memoryReplyStreams';
import { registeredSession, REGISTERED_USER_ID } from '@backend/test/session';

vi.mock('@backend/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));

vi.mock('@backend/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));

// @backend/redis is the boundary to Redis: stream owners and reply streams live in memory.
vi.mock('@backend/redis', async () => {
  const { replyStreams: fake } = await import('@backend/test/memoryReplyStreams.js');
  return {
    redis: { connection: {}, close: vi.fn(async () => undefined) },
    closeRedis: vi.fn(async () => undefined),
    saveStreamOwner: fake.saveStreamOwner,
    findStreamOwner: fake.findStreamOwner,
    openReplyStream: fake.openReplyStream,
  };
});

vi.mock('@backend/queue', () => ({
  enqueueDirectReply: vi.fn(),
  closeQueue: vi.fn(async () => undefined),
}));

import { auth } from '@backend/auth';

const mockedGetSession = vi.mocked(auth.api.getSession);

const STREAM_ID = '44444444-4444-4444-8444-444444444444';
const OTHER_USER_ID = '55555555-5555-4555-8555-555555555555';

type SseFrame = { id?: string; event?: string; data?: unknown; comment?: string };

const framesIn = (body: string): SseFrame[] =>
  body
    .split('\n\n')
    .filter((block) => block.trim() !== '')
    .map((block) => {
      const frame: SseFrame = {};
      for (const line of block.split('\n')) {
        if (line.startsWith(':')) frame.comment = line.slice(1).trim();
        else if (line.startsWith('id: ')) frame.id = line.slice(4);
        else if (line.startsWith('event: ')) frame.event = line.slice(7);
        else if (line.startsWith('data: ')) frame.data = JSON.parse(line.slice(6));
      }
      return frame;
    });

const { logger, lines } = captureLogger();
let app: FastifyInstance;

const read = async (streamId = STREAM_ID): Promise<LightMyRequestResponse> =>
  app.inject({ method: 'GET', url: `/api/streams/${streamId}` });

beforeAll(async () => {
  app = await createTestApp({ logger });
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
  replyStreams.reset();
  lines.length = 0;
  mockedGetSession.mockResolvedValue(registeredSession() as never);
  replyStreams.owners.set(STREAM_ID, REGISTERED_USER_ID);
});

describe('GET /api/streams/:streamId', () => {
  it('relays token, usage, error and end in order, each with its stream entry id, then closes', async () => {
    const ids = replyStreams.append(
      STREAM_ID,
      { type: 'token', token: '2+2' },
      { type: 'token', token: ' is 4' },
      { type: 'usage', promptTokens: 5, completionTokens: 2, totalTokens: 7 },
      { type: 'error', success: false, error: 'Internal', message: GENERIC_ERROR_MESSAGE },
      { type: 'end' },
    );

    const res = await read();

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/event-stream');
    expect(framesIn(res.body)).toEqual([
      { id: ids[0], event: 'token', data: { token: '2+2' } },
      { id: ids[1], event: 'token', data: { token: ' is 4' } },
      {
        id: ids[2],
        event: 'usage',
        data: { promptTokens: 5, completionTokens: 2, totalTokens: 7 },
      },
      {
        id: ids[3],
        event: 'error',
        data: { success: false, error: 'Internal', message: GENERIC_ERROR_MESSAGE },
      },
      { id: ids[4], event: 'end', data: {} },
    ]);
  });

  it('reads from the start, then on from the last entry it relayed', async () => {
    const [first] = replyStreams.append(STREAM_ID, { type: 'token', token: 'a' });
    const relaying = read();
    // The relay is now waiting after `first`; the worker appends the rest.
    await vi.waitFor(() => expect(replyStreams.reads).toHaveLength(2));
    replyStreams.append(STREAM_ID, { type: 'token', token: 'b' }, { type: 'end' });

    const res = await relaying;

    expect(framesIn(res.body).map((f) => f.event)).toEqual(['token', 'token', 'end']);
    expect(replyStreams.reads.map((r) => r.afterId).slice(0, 2)).toEqual(['0', first]);
  });

  it('sends a keep-alive comment while the stream is quiet', async () => {
    replyStreams.state.timeouts = 1;
    const relaying = read();
    await vi.waitFor(() => expect(replyStreams.reads).toHaveLength(2));
    replyStreams.append(STREAM_ID, { type: 'end' });

    const res = await relaying;

    expect(framesIn(res.body)[0]).toEqual({ comment: 'keep-alive' });
    expect(framesIn(res.body).at(-1)).toMatchObject({ event: 'end' });
  });

  it('stops reading at end and drops its connection', async () => {
    replyStreams.append(STREAM_ID, { type: 'end' }, { type: 'token', token: 'late' });

    const res = await read();

    expect(framesIn(res.body).map((f) => f.event)).toEqual(['end']);
    expect(replyStreams.state.closedReaders).toBe(1);
  });

  it('skips an entry it cannot read rather than failing the stream', async () => {
    replyStreams.appendRaw(STREAM_ID, JSON.stringify({ type: 'step-started' }));
    replyStreams.append(STREAM_ID, { type: 'token', token: 'ok' }, { type: 'end' });

    const res = await read();

    expect(framesIn(res.body).map((f) => f.event)).toEqual(['token', 'end']);
  });

  it('ends with a generic error event when Redis fails mid-stream, logging it once', async () => {
    replyStreams.state.readError = new Error('redis down at 10.0.0.9');

    const res = await read();

    expect(framesIn(res.body)).toEqual([
      {
        event: 'error',
        data: { success: false, error: 'Internal', message: GENERIC_ERROR_MESSAGE },
      },
      { event: 'end', data: {} },
    ]);
    expect(res.body).not.toContain('10.0.0.9');
    expect(eventLines(lines, 'chat.stream.relay.failed')).toMatchObject([
      { level: LEVEL.error, 'nebula.component': 'redis' },
    ]);
  });

  describe('owner check', () => {
    it("answers 404 for another User's stream, never revealing that it exists", async () => {
      replyStreams.owners.set(STREAM_ID, OTHER_USER_ID);
      replyStreams.append(STREAM_ID, { type: 'token', token: 'secret' }, { type: 'end' });

      const res = await read();

      expect(res.statusCode).toBe(404);
      expect(res.json()).toMatchObject({ success: false, error: 'NotFound' });
      expect(res.body).not.toContain('secret');
      expect(replyStreams.reads).toHaveLength(0);
    });

    it('answers 404 for a stream nobody owns', async () => {
      replyStreams.owners.clear();

      const res = await read();

      expect(res.statusCode).toBe(404);
    });

    it('answers 401 without an auth session', async () => {
      mockedGetSession.mockResolvedValue(null);

      const res = await read();

      expect(res.statusCode).toBe(401);
      expect(replyStreams.reads).toHaveLength(0);
    });

    it('answers 400 for a stream id that is not a UUID', async () => {
      const res = await read('not-a-uuid');

      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ error: 'Validation' });
    });
  });
});
