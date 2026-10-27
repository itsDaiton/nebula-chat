import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { fromPartial } from '@total-typescript/shoehorn';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MODEL_IDS } from '@nebula-chat/contracts';
import type { DirectReplyJob, RunJob } from '@nebula-chat/contracts';
import { env } from '@server/env';
import { createTestApp } from '@server/test/app';
import { replyStreams } from '@server/test/memoryReplyStreams';
import {
  guestSession,
  registeredSession,
  REGISTERED_USER_ID,
  unverifiedSession,
} from '@server/test/session';

const fakeTx = { __tx: true };

// The send path's one transaction runs against the faked repositories below.
vi.mock('@server/db', () => ({
  db: { transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(fakeTx)) },
  closeDb: vi.fn(async () => undefined),
}));

vi.mock('@server/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));

// The repositories are the boundary to Postgres; everything above them is real.
vi.mock('@server/modules/session/session.repository', () => ({
  sessionRepository: { findByIdTx: vi.fn(), updateModelTx: vi.fn() },
}));

vi.mock('@server/modules/message/message.repository', () => ({
  messageRepository: { createTx: vi.fn(), countUserMessagesByOwner: vi.fn() },
}));

vi.mock('@server/modules/run/run.repository', () => ({
  runRepository: { createTx: vi.fn() },
}));

// @server/redis is the boundary to Redis: stream owners live in memory.
vi.mock('@server/redis', async () => {
  const { replyStreamsModule } = await import('@server/test/memoryReplyStreams.js');
  return {
    redis: { connection: {}, close: vi.fn(async () => undefined) },
    closeRedis: vi.fn(async () => undefined),
    ...replyStreamsModule,
  };
});

// @server/queue is the boundary to BullMQ: enqueued jobs are kept in memory.
const { enqueued, enqueuedRuns } = vi.hoisted(() => ({
  enqueued: [] as DirectReplyJob[],
  enqueuedRuns: [] as RunJob[],
}));
vi.mock('@server/queue', () => ({
  enqueueDirectReply: vi.fn(async (job: DirectReplyJob) => {
    enqueued.push(job);
  }),
  enqueueRun: vi.fn(async (job: RunJob) => {
    enqueuedRuns.push(job);
  }),
  closeQueue: vi.fn(async () => undefined),
}));

import { auth } from '@server/auth';
import { messageRepository } from '@server/modules/message/message.repository';
import { runRepository } from '@server/modules/run/run.repository';
import { sessionRepository } from '@server/modules/session/session.repository';

const mockedGetSession = vi.mocked(auth.api.getSession);
const sessionRepo = vi.mocked(sessionRepository);
const messageRepo = vi.mocked(messageRepository);
const runRepo = vi.mocked(runRepository);

const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const MESSAGE_ID = '22222222-2222-4222-8222-222222222222';
const RUN_ID = '33333333-3333-4333-8333-333333333333';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const validBody = { content: 'what is 2+2?', mode: 'direct' };

// The send route is rate-limited to 10 requests per minute per IP, and
// @fastify/rate-limit keeps that state for the life of the app, so each request
// comes from its own address; the limit itself is exercised deliberately below.
let nextIp = 0;
const uniqueIp = () => `10.1.${Math.floor(nextIp / 256) % 256}.${nextIp++ % 256}`;

const send = async (
  payload: object,
  { sessionId = SESSION_ID, remoteAddress = uniqueIp() } = {},
): Promise<LightMyRequestResponse> =>
  app.inject({
    method: 'POST',
    url: `/api/sessions/${sessionId}/messages`,
    payload,
    remoteAddress,
  });

let app: FastifyInstance;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
  replyStreams.reset();
  enqueued.length = 0;
  enqueuedRuns.length = 0;
  // Default: an authenticated Registered user (uncapped) sending to a Session they own.
  mockedGetSession.mockResolvedValue(registeredSession() as never);
  messageRepo.countUserMessagesByOwner.mockResolvedValue(0);
  sessionRepo.findByIdTx.mockResolvedValue(
    fromPartial({ id: SESSION_ID, userId: REGISTERED_USER_ID, model: 'gpt-4o-mini' }),
  );
  messageRepo.createTx.mockResolvedValue(fromPartial({ id: MESSAGE_ID }));
  runRepo.createTx.mockResolvedValue({ id: RUN_ID });
});

describe('POST /api/sessions/:sessionId/messages', () => {
  it('answers 202 with the persisted Message and the stream to read its reply from', async () => {
    const res = await send(validBody);

    expect(res.statusCode).toBe(202);
    const body = res.json<{ messageId: string; streamId: string }>();
    expect(body).toEqual({ messageId: MESSAGE_ID, streamId: expect.stringMatching(UUID) });
  });

  it('persists the user Message in the Session before answering', async () => {
    await send(validBody);

    expect(messageRepo.createTx).toHaveBeenCalledExactlyOnceWith(fakeTx, {
      sessionId: SESSION_ID,
      role: 'user',
      content: 'what is 2+2?',
    });
  });

  it('enqueues one Direct reply job carrying only IDs', async () => {
    const res = await send(validBody);

    expect(enqueued).toEqual([
      {
        userId: REGISTERED_USER_ID,
        sessionId: SESSION_ID,
        messageId: MESSAGE_ID,
        streamId: res.json<{ streamId: string }>().streamId,
      },
    ]);
  });

  it('makes the caller the only User who may read the reply stream', async () => {
    const res = await send(validBody);

    const { streamId } = res.json<{ streamId: string }>();
    expect(replyStreams.owners.get(streamId)).toBe(REGISTERED_USER_ID);
  });

  it('records the reply as the Session’s in-flight stream, so a refreshed page can re-attach to it', async () => {
    const res = await send(validBody);

    const { streamId } = res.json<{ streamId: string }>();
    expect(replyStreams.activeStreams.get(SESSION_ID)).toBe(streamId);
  });

  it("binds the Session to the Model the caller picked when it differs from the Session's", async () => {
    await send({ ...validBody, model: 'gpt-4.1' });

    expect(sessionRepo.updateModelTx).toHaveBeenCalledExactlyOnceWith(
      fakeTx,
      SESSION_ID,
      'gpt-4.1',
    );
  });

  it.each(MODEL_IDS)(
    'accepts %s, a Model in the catalog, as the Session’s Model',
    async (model) => {
      const res = await send({ ...validBody, model });

      expect(res.statusCode).toBe(202);
    },
  );

  it("leaves the Session's Model alone when the caller picks the same one or none", async () => {
    await send({ ...validBody, model: 'gpt-4o-mini' });
    await send(validBody);

    expect(sessionRepo.updateModelTx).not.toHaveBeenCalled();
  });

  it("answers 404 for a Session the caller doesn't own, persisting and enqueuing nothing", async () => {
    sessionRepo.findByIdTx.mockResolvedValue(null);

    const res = await send(validBody);

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ success: false, error: 'NotFound' });
    expect(messageRepo.createTx).not.toHaveBeenCalled();
    expect(enqueued).toEqual([]);
  });

  it('refuses a Message to an archived Session with a Conflict telling the client to restore it', async () => {
    sessionRepo.findByIdTx.mockResolvedValue(
      fromPartial({
        id: SESSION_ID,
        userId: REGISTERED_USER_ID,
        model: 'gpt-4o-mini',
        archivedAt: new Date(),
      }),
    );

    const res = await send(validBody);

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ success: false, error: 'Conflict' });
    expect(res.json().message).toMatch(/restore/i);
    expect(messageRepo.createTx).not.toHaveBeenCalled();
    expect(enqueued).toEqual([]);
  });

  it('answers 413 for a Message over the prompt token budget, before persisting it', async () => {
    const res = await send({ ...validBody, content: 'token '.repeat(2_500) });

    expect(res.statusCode).toBe(413);
    expect(res.json()).toMatchObject({ error: 'PayloadTooLarge' });
    expect(messageRepo.createTx).not.toHaveBeenCalled();
  });

  it('answers 500 when the job cannot be enqueued', async () => {
    const { enqueueDirectReply } = await import('@server/queue.js');
    vi.mocked(enqueueDirectReply).mockRejectedValueOnce(new Error('redis down'));

    const res = await send(validBody);

    expect(res.statusCode).toBe(500);
    expect(res.json()).toMatchObject({ error: 'Internal' });
  });

  describe('validation', () => {
    it.each([
      ['an unknown mode', { ...validBody, mode: 'deep' }],
      ['no mode', { content: 'hi' }],
      ['empty content', { ...validBody, content: '' }],
      ['an unknown Model', { ...validBody, model: 'gpt-0' }],
    ])('rejects %s with a 400 before any work happens', async (_case, payload) => {
      const res = await send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ success: false, error: 'Validation' });
      expect(messageRepo.createTx).not.toHaveBeenCalled();
      expect(enqueued).toEqual([]);
    });

    it('rejects a session id that is not a UUID', async () => {
      const res = await send(validBody, { sessionId: 'not-a-uuid' });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Run mode', () => {
    const runBody = { ...validBody, mode: 'run' };

    it('answers 202 with the persisted Message, its stream and the Run it started', async () => {
      const res = await send(runBody);

      expect(res.statusCode).toBe(202);
      expect(res.json()).toEqual({
        messageId: MESSAGE_ID,
        streamId: expect.stringMatching(UUID),
        runId: RUN_ID,
      });
    });

    it('creates the Run, queued, for the Message in the same transaction', async () => {
      await send(runBody);

      expect(runRepo.createTx).toHaveBeenCalledExactlyOnceWith(fakeTx, {
        userId: REGISTERED_USER_ID,
        sessionId: SESSION_ID,
        messageId: MESSAGE_ID,
      });
    });

    it('enqueues one Run job carrying only IDs, and no Direct reply', async () => {
      const res = await send(runBody);

      expect(enqueuedRuns).toEqual([
        {
          userId: REGISTERED_USER_ID,
          sessionId: SESSION_ID,
          messageId: MESSAGE_ID,
          streamId: res.json<{ streamId: string }>().streamId,
          runId: RUN_ID,
        },
      ]);
      expect(enqueued).toEqual([]);
    });

    it('lets the caller read the Run’s stream and re-attach to it', async () => {
      const res = await send(runBody);

      const { streamId } = res.json<{ streamId: string }>();
      expect(replyStreams.owners.get(streamId)).toBe(REGISTERED_USER_ID);
      expect(replyStreams.activeStreams.get(SESSION_ID)).toBe(streamId);
    });

    it('rejects a Guest with the typed 403 Forbidden, persisting and enqueuing nothing', async () => {
      mockedGetSession.mockResolvedValue(guestSession() as never);

      const res = await send(runBody);

      expect(res.statusCode).toBe(403);
      expect(res.json()).toMatchObject({ success: false, error: 'Forbidden' });
      expect(messageRepo.createTx).not.toHaveBeenCalled();
      expect(runRepo.createTx).not.toHaveBeenCalled();
      expect(enqueuedRuns).toEqual([]);
    });

    it('leaves a Direct reply without a Run', async () => {
      const res = await send(validBody);

      expect(res.json()).not.toHaveProperty('runId');
      expect(runRepo.createTx).not.toHaveBeenCalled();
      expect(enqueuedRuns).toEqual([]);
    });
  });

  describe('Guest message allowance', () => {
    // GUEST_MESSAGE_ALLOWANCE defaults to 10 (env.ts); the count comes live from Postgres.
    const CAP = env.GUEST_MESSAGE_ALLOWANCE;

    it('lets a Guest under the cap send', async () => {
      mockedGetSession.mockResolvedValue(guestSession() as never);
      messageRepo.countUserMessagesByOwner.mockResolvedValue(CAP - 1);

      const res = await send(validBody);

      expect(res.statusCode).toBe(202);
      expect(enqueued).toHaveLength(1);
    });

    it('rejects a Guest at the cap with the typed 403 MessageAllowanceReached, persisting nothing', async () => {
      mockedGetSession.mockResolvedValue(guestSession() as never);
      messageRepo.countUserMessagesByOwner.mockResolvedValue(CAP);

      const res = await send(validBody);

      expect(res.statusCode).toBe(403);
      expect(res.json()).toEqual({
        success: false,
        error: 'MessageAllowanceReached',
        message: `Message allowance exceeded: a Guest can send at most ${CAP} messages.`,
      });
      expect(messageRepo.createTx).not.toHaveBeenCalled();
      expect(enqueued).toEqual([]);
    });

    it('caps a Registered user whose email is unverified like a Guest', async () => {
      mockedGetSession.mockResolvedValue(unverifiedSession() as never);
      messageRepo.countUserMessagesByOwner.mockResolvedValue(CAP);

      const res = await send(validBody);

      expect(res.statusCode).toBe(403);
      expect(res.json()).toMatchObject({ error: 'MessageAllowanceReached' });
    });

    it('leaves a verified Registered user uncapped, never counting their messages', async () => {
      messageRepo.countUserMessagesByOwner.mockResolvedValue(CAP + 100);

      const res = await send(validBody);

      expect(res.statusCode).toBe(202);
      expect(messageRepo.countUserMessagesByOwner).not.toHaveBeenCalled();
    });

    it('rejects a request with no authenticated session', async () => {
      mockedGetSession.mockResolvedValue(null);

      const res = await send(validBody);

      expect(res.statusCode).toBe(401);
      expect(enqueued).toEqual([]);
    });
  });

  it('rate-limits sends to 10 a minute from one address', async () => {
    const remoteAddress = uniqueIp();
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      statuses.push((await send(validBody, { remoteAddress })).statusCode);
    }

    expect(statuses.slice(0, 10).every((status) => status === 202)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});

describe('GET /api/chat/message-allowance', () => {
  const CAP = env.GUEST_MESSAGE_ALLOWANCE;

  const getAllowance = async (): Promise<LightMyRequestResponse> =>
    app.inject({ method: 'GET', url: '/api/chat/message-allowance', remoteAddress: uniqueIp() });

  it("reports a Guest's limit, live count and what is left", async () => {
    mockedGetSession.mockResolvedValue(guestSession() as never);
    messageRepo.countUserMessagesByOwner.mockResolvedValue(3);

    const res = await getAllowance();

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ metered: true, limit: CAP, used: 3, remaining: CAP - 3 });
  });

  it('meters a Registered user whose email is unverified like a Guest', async () => {
    mockedGetSession.mockResolvedValue(unverifiedSession() as never);
    messageRepo.countUserMessagesByOwner.mockResolvedValue(1);

    const res = await getAllowance();

    expect(res.json()).toEqual({ metered: true, limit: CAP, used: 1, remaining: CAP - 1 });
  });

  it('answers metered false for a verified Registered user, never counting', async () => {
    const res = await getAllowance();

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ metered: false });
    expect(messageRepo.countUserMessagesByOwner).not.toHaveBeenCalled();
  });

  it('clamps remaining at 0 when the count is above the limit', async () => {
    mockedGetSession.mockResolvedValue(guestSession() as never);
    messageRepo.countUserMessagesByOwner.mockResolvedValue(CAP + 4);

    const res = await getAllowance();

    expect(res.json()).toEqual({ metered: true, limit: CAP, used: CAP + 4, remaining: 0 });
  });

  it('agrees with the send path: 0 remaining here is a 403 there', async () => {
    mockedGetSession.mockResolvedValue(guestSession() as never);
    messageRepo.countUserMessagesByOwner.mockResolvedValue(CAP);

    const read = await getAllowance();
    const sent = await send(validBody);

    expect(read.json()).toMatchObject({ metered: true, remaining: 0 });
    expect(sent.statusCode).toBe(403);
  });

  it('rejects a request with no authenticated session with the 401 envelope', async () => {
    mockedGetSession.mockResolvedValue(null);

    const res = await getAllowance();

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ success: false, error: 'Unauthorized' });
  });
});
