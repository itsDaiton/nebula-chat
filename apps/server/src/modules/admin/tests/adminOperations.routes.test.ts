import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CLARIFYING_QUESTION_TIMEOUT_QUEUE,
  DIRECT_REPLY_QUEUE,
  RUN_QUEUE,
} from '@nebula-chat/contracts';
import { listenForLogLevelChanges } from '@nebula-chat/otel';
import { captureLogger } from '@nebula-chat/otel/testing';
import { createTestApp } from '@server/test/app';
import { memoryPubSub } from '@server/test/memoryPubSub';
import { adminSession, adminWithout2FASession, registeredSession } from '@server/test/session';

vi.mock('@server/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));

vi.mock('@server/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));

// BullMQ sits behind the queue inspector, faked here; worker liveness runs over an in-memory pubsub.
vi.mock('@server/queue', () => ({
  inspectQueues: vi.fn(),
  pingWorker: vi.fn(),
  enqueueDirectReply: vi.fn(),
  enqueueRun: vi.fn(),
  closeQueue: vi.fn(async () => undefined),
}));

vi.mock('@server/redis', () => ({
  redis: { cache: {}, connection: {}, close: vi.fn(async () => undefined) },
  closeRedis: vi.fn(async () => undefined),
}));

import { auth } from '@server/auth';
import { enqueueDirectReply, enqueueRun, inspectQueues, pingWorker } from '@server/queue';
import { redis } from '@server/redis';

const mockedGetSession = vi.mocked(auth.api.getSession);
const inspect = vi.mocked(inspectQueues);

const ROUTE = '/api/admin/operations';
const COOKIE = { cookie: 'better-auth.session_token=abc' };
const RUN_ID = '55555555-5555-4555-8555-555555555555';

const queueStats: Awaited<ReturnType<typeof inspectQueues>> = {
  queues: [
    { name: DIRECT_REPLY_QUEUE, waiting: 2, active: 1, delayed: 0, failed: 3 },
    { name: RUN_QUEUE, waiting: 1, active: 1, delayed: 0, failed: 4 },
    { name: CLARIFYING_QUESTION_TIMEOUT_QUEUE, waiting: 0, active: 0, delayed: 1, failed: 0 },
  ],
  failedJobs: [
    {
      id: '12',
      queue: RUN_QUEUE,
      failedAt: new Date('2026-10-27T19:04:00.000Z'),
      attemptsMade: 3,
      error: 'ModelTimeout: the Orchestrator did not answer',
      runId: RUN_ID,
    },
    {
      id: '40',
      queue: DIRECT_REPLY_QUEUE,
      failedAt: new Date('2026-10-27T16:22:00.000Z'),
      attemptsMade: 3,
      error: 'ProviderRateLimited: 429 from openai',
      runId: null,
    },
  ],
};

let app: FastifyInstance;

const startWorker = async (instanceId: string) => {
  await listenForLogLevelChanges({
    logger: captureLogger().logger,
    pubsub: redis.pubsub,
    serviceName: 'nebula-chat-worker',
    instanceId,
  });
};

const read = () => app.inject({ method: 'GET', url: ROUTE, headers: COOKIE });

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetSession.mockResolvedValue(adminSession() as never);
  inspect.mockResolvedValue(queueStats);
  redis.pubsub = memoryPubSub();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GET /api/admin/operations', () => {
  it('shapes the queue counts, the latest failed jobs and the answering worker instances', async () => {
    await startWorker('worker-1');
    await startWorker('worker-2');

    const res = await read();

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      worker: { status: 'answering', instances: 2 },
      queues: queueStats.queues,
      failedJobs: [
        {
          id: '12',
          queue: RUN_QUEUE,
          failedAt: '2026-10-27T19:04:00.000Z',
          attemptsMade: 3,
          error: 'ModelTimeout: the Orchestrator did not answer',
          runId: RUN_ID,
        },
        {
          id: '40',
          queue: DIRECT_REPLY_QUEUE,
          failedAt: '2026-10-27T16:22:00.000Z',
          attemptsMade: 3,
          error: 'ProviderRateLimited: 429 from openai',
          runId: null,
        },
      ],
    });
  });

  it('answers a sleeping worker as not answering, without waking it or enqueueing', async () => {
    const res = await read();

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ worker: { status: 'not_answering', instances: 0 } });
    expect(pingWorker).not.toHaveBeenCalled();
    expect(enqueueDirectReply).not.toHaveBeenCalled();
    expect(enqueueRun).not.toHaveBeenCalled();
  });

  it('answers Unavailable when Redis refuses the read', async () => {
    inspect.mockRejectedValue(new Error('Connection is closed.'));

    const res = await read();

    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ success: false, error: 'Unavailable' });
  });

  it('answers Unavailable when Redis does not answer in time', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    inspect.mockReturnValue(new Promise(() => undefined));

    const pending = read();
    await vi.advanceTimersByTimeAsync(10_000);
    const res = await pending;

    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ error: 'Unavailable' });
  });

  it('refuses a non-Admin and an Admin without two-factor', async () => {
    mockedGetSession.mockResolvedValue(registeredSession() as never);
    expect((await read()).statusCode).toBe(404);

    mockedGetSession.mockResolvedValue(adminWithout2FASession() as never);
    const res = await read();
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ error: 'TwoFactorRequired' });
    expect(inspect).not.toHaveBeenCalled();
  });

  it('refuses a request without a session', async () => {
    mockedGetSession.mockResolvedValue(null as never);

    expect((await app.inject({ method: 'GET', url: ROUTE })).statusCode).toBe(401);
  });
});
