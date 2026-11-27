import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CLARIFYING_QUESTION_TIMEOUT_QUEUE,
  DIRECT_REPLY_QUEUE,
  OWN_KEY_VALIDATION_QUEUE,
  RUN_QUEUE,
} from '@nebula-chat/contracts';
import { captureLogger, captureSpans, eventLines, LEVEL } from '@nebula-chat/otel/testing';

const bull = vi.hoisted(() => ({
  constructed: [] as { name: string; options: unknown }[],
  add: vi.fn(async () => ({ id: '1' })),
  getJob: vi.fn(),
  getJobCounts: vi.fn<(name: string) => Promise<Record<string, number>>>(async () => ({})),
  getFailed: vi.fn<(name: string) => Promise<unknown[]>>(async () => []),
  close: vi.fn(async () => undefined),
}));

// BullMQ is the boundary: a Queue that records what it is given.
vi.mock('bullmq', () => ({
  Queue: class {
    add = bull.add;
    getJob = bull.getJob;
    close = bull.close;
    getJobCounts = () => bull.getJobCounts(this.name);
    getFailed = () => bull.getFailed(this.name);
    constructor(
      readonly name: string,
      options: unknown,
    ) {
      bull.constructed.push({ name, options });
    }
  },
}));

vi.mock('@server/redis', () => ({
  redis: { dedicatedConnection: vi.fn(() => ({ dedicated: true })) },
}));

import { withSpan } from '@nebula-chat/otel';
import {
  closeQueue,
  enqueueDirectReply,
  enqueueOwnKeyValidation,
  enqueueRun,
  inspectQueues,
  pingWorker,
  promoteClarifyingQuestionTimeout,
  removeClarifyingQuestionTimeout,
} from '@server/queue';

const job = {
  userId: '11111111-1111-4111-8111-111111111111',
  sessionId: '22222222-2222-4222-8222-222222222222',
  messageId: '33333333-3333-4333-8333-333333333333',
  streamId: '44444444-4444-4444-8444-444444444444',
};

const RUN_ID = '55555555-5555-4555-8555-555555555555';

const spans = captureSpans();
afterAll(() => spans.stop());

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.clearAllMocks();
  spans.reset();
  fetchMock.mockResolvedValue(new Response('{"status":"ok"}', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('enqueueDirectReply', () => {
  it('adds the job to the Direct reply queue on a dedicated connection', async () => {
    const { logger } = captureLogger();
    await enqueueDirectReply(job, logger);

    expect(bull.constructed).toEqual([
      {
        name: DIRECT_REPLY_QUEUE,
        options: expect.objectContaining({ connection: { dedicated: true } }),
      },
    ]);
    expect(bull.add).toHaveBeenCalledWith('direct-reply', {
      ...job,
      traceparent: expect.stringMatching(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/),
    });
  });

  it('carries the request trace in the payload, under a producer span', async () => {
    await withSpan('http request', {}, () => enqueueDirectReply(job, captureLogger().logger));

    const [publish, request] = spans.spans();
    const { traceId, spanId } = publish!.spanContext();
    expect(publish!.parentSpanContext?.spanId).toBe(request!.spanContext().spanId);
    expect(bull.add).toHaveBeenCalledWith('direct-reply', {
      ...job,
      traceparent: `00-${traceId}-${spanId}-01`,
    });
    expect(traceId).toBe(request!.spanContext().traceId);
  });

  it('builds the queue once, on first use', async () => {
    const { logger } = captureLogger();
    await enqueueDirectReply(job, logger);
    await enqueueDirectReply(job, logger);

    expect(bull.constructed).toHaveLength(1);
  });

  it('refuses a payload that breaks the contract, enqueuing nothing', async () => {
    const { logger } = captureLogger();

    await expect(enqueueDirectReply({ ...job, messageId: 'not-a-uuid' }, logger)).rejects.toThrow();
    expect(bull.add).not.toHaveBeenCalled();
  });

  it("pings the worker's /health so a sleeping worker wakes up", async () => {
    const { logger } = captureLogger();
    await enqueueDirectReply(job, logger);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('http://localhost:3001/health');
  });

  it('does not wait on the ping, so a cold start never holds up the send', async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    const { logger } = captureLogger();

    await expect(enqueueDirectReply(job, logger)).resolves.toBeUndefined();
  });
});

describe('enqueueRun', () => {
  const runJob = { ...job, runId: '55555555-5555-4555-8555-555555555555' };

  it('adds the job to the Run queue, apart from Direct replies', async () => {
    await enqueueRun(runJob, captureLogger().logger);

    expect(bull.constructed.map(({ name }) => name)).toContain(RUN_QUEUE);
    expect(bull.add).toHaveBeenCalledWith(
      'run',
      { ...runJob, traceparent: expect.stringMatching(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/) },
      expect.anything(),
    );
  });

  it('has BullMQ retry the job with exponential backoff, so a crashed Run resumes', async () => {
    await enqueueRun(runJob, captureLogger().logger);

    expect(bull.add).toHaveBeenCalledWith('run', expect.anything(), {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5_000 },
    });
  });

  it('refuses a payload that breaks the contract, enqueuing nothing', async () => {
    await expect(
      enqueueRun({ ...runJob, runId: 'not-a-uuid' }, captureLogger().logger),
    ).rejects.toThrow();
    expect(bull.add).not.toHaveBeenCalled();
  });

  it("pings the worker's /health so a sleeping worker wakes up", async () => {
    await enqueueRun(runJob, captureLogger().logger);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  });
});

describe('enqueueOwnKeyValidation', () => {
  const validation = { ownKeyId: '66666666-6666-4666-8666-666666666666' };

  it('adds the id to its own queue, carrying nothing else', async () => {
    await enqueueOwnKeyValidation(validation, captureLogger().logger);

    expect(bull.constructed.map(({ name }) => name)).toContain(OWN_KEY_VALIDATION_QUEUE);
    expect(bull.add).toHaveBeenCalledWith('own-key-validation', {
      ...validation,
      traceparent: expect.any(String),
    });
  });

  it('refuses an id that is not a UUID, enqueuing nothing', async () => {
    await expect(
      enqueueOwnKeyValidation({ ownKeyId: 'nope' }, captureLogger().logger),
    ).rejects.toThrow();
    expect(bull.add).not.toHaveBeenCalled();
  });
});

describe('pingWorker', () => {
  it('logs a failed ping as a warning and never rejects', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const { logger, lines } = captureLogger();

    await expect(pingWorker(logger)).resolves.toBeUndefined();
    expect(eventLines(lines, 'worker.ping.failed')).toMatchObject([{ level: LEVEL.warn }]);
  });

  it('counts an unhealthy answer as a failed ping, without retrying a permanent one', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 404 }));
    const { logger, lines } = captureLogger();

    await pingWorker(logger);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(eventLines(lines, 'worker.ping.failed')).toMatchObject([
      { err: expect.objectContaining({ message: 'Worker /health answered 404' }) },
    ]);
  });

  describe('when the edge answers 429 or 5xx instead of waking the worker', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('tries again and stays quiet once the worker answers', async () => {
      fetchMock
        .mockResolvedValueOnce(new Response('slow down', { status: 429 }))
        .mockResolvedValueOnce(new Response('{"status":"ok"}', { status: 200 }));
      const { logger, lines } = captureLogger();

      const done = pingWorker(logger);
      await vi.runAllTimersAsync();
      await done;

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(lines).toEqual([]);
    });

    it('gives up after three tries and logs who answered', async () => {
      fetchMock.mockImplementation(async () =>
        Response.json(
          { error: 'rate limited' },
          { status: 429, headers: { server: 'cloudflare' } },
        ),
      );
      const { logger, lines } = captureLogger();

      const done = pingWorker(logger);
      await vi.runAllTimersAsync();
      await done;

      expect(fetchMock).toHaveBeenCalledTimes(3);
      const [line] = eventLines(lines, 'worker.ping.failed');
      expect(eventLines(lines, 'worker.ping.failed')).toHaveLength(1);
      expect(line).toMatchObject({
        err: expect.objectContaining({
          message: expect.stringMatching(/answered 429.*server: cloudflare.*rate limited/s),
        }),
      });
    });
  });

  it('logs nothing when the worker answers', async () => {
    const { logger, lines } = captureLogger();

    await pingWorker(logger);

    expect(lines).toEqual([]);
  });
});

describe('closeQueue', () => {
  it('closes the queue once it exists', async () => {
    await enqueueDirectReply(job, captureLogger().logger);
    await closeQueue();

    expect(bull.close).toHaveBeenCalled();
  });
});

describe('the Clarifying question timeout job', () => {
  const JOB_ID = `clarifying-question-timeout-${RUN_ID}`;

  it('is looked up by its deterministic id and removed once the answer settles the wait', async () => {
    const remove = vi.fn(async () => undefined);
    bull.getJob.mockResolvedValueOnce({ remove });

    await removeClarifyingQuestionTimeout(RUN_ID);

    expect(bull.getJob).toHaveBeenCalledWith(JOB_ID);
    expect(remove).toHaveBeenCalledOnce();
  });

  it('tolerates a job that is already active or gone when removing it', async () => {
    bull.getJob.mockResolvedValueOnce({ remove: vi.fn().mockRejectedValue(new Error('locked')) });
    await expect(removeClarifyingQuestionTimeout(RUN_ID)).resolves.toBeUndefined();

    bull.getJob.mockResolvedValueOnce(undefined);
    await expect(removeClarifyingQuestionTimeout(RUN_ID)).resolves.toBeUndefined();
  });

  it('is promoted to fire now on a cancel, and the sleeping worker is pinged', async () => {
    const promote = vi.fn(async () => undefined);
    bull.getJob.mockResolvedValueOnce({ promote });

    await promoteClarifyingQuestionTimeout(RUN_ID, captureLogger().logger);

    expect(promote).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalled();
  });

  it('tolerates a job that is no longer delayed when promoting it', async () => {
    bull.getJob.mockResolvedValueOnce({
      promote: vi.fn().mockRejectedValue(new Error('not delayed')),
    });

    await expect(
      promoteClarifyingQuestionTimeout(RUN_ID, captureLogger().logger),
    ).resolves.toBeUndefined();
  });
});

describe('inspectQueues', () => {
  const failedJob = (id: string, finishedOn: number, data: unknown) => ({
    id,
    finishedOn,
    timestamp: finishedOn - 1_000,
    attemptsMade: 3,
    failedReason: `boom ${id}`,
    data,
  });

  it('counts each inspected queue without pinging the worker or adding a job', async () => {
    bull.getJobCounts.mockImplementation(async (name) =>
      name === RUN_QUEUE
        ? { waiting: 1, active: 1, delayed: 0, failed: 4 }
        : { waiting: 0, active: 0, delayed: name === DIRECT_REPLY_QUEUE ? 2 : 1, failed: 0 },
    );

    const { queues } = await inspectQueues();

    expect(queues).toEqual([
      { name: DIRECT_REPLY_QUEUE, waiting: 0, active: 0, delayed: 2, failed: 0 },
      { name: RUN_QUEUE, waiting: 1, active: 1, delayed: 0, failed: 4 },
      { name: CLARIFYING_QUESTION_TIMEOUT_QUEUE, waiting: 0, active: 0, delayed: 1, failed: 0 },
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(bull.add).not.toHaveBeenCalled();
  });

  it('keeps only the Run id from a failed job payload', async () => {
    bull.getFailed.mockImplementation(async (name) =>
      name === RUN_QUEUE
        ? [failedJob('7', 2_000, { ...job, runId: RUN_ID, traceparent: 'secret-trace' })]
        : [],
    );

    const { failedJobs } = await inspectQueues();

    expect(failedJobs).toEqual([
      {
        id: '7',
        queue: RUN_QUEUE,
        failedAt: new Date(2_000),
        attemptsMade: 3,
        error: 'boom 7',
        runId: RUN_ID,
      },
    ]);
  });

  it('gives a job with an unparsable payload no Run id', async () => {
    bull.getFailed.mockImplementation(async (name) =>
      name === RUN_QUEUE
        ? [failedJob('8', 2_000, { runId: 'not-a-uuid' }), failedJob('9', 1_000, null)]
        : [],
    );

    const { failedJobs } = await inspectQueues();

    expect(failedJobs.map(({ id, runId }) => ({ id, runId }))).toEqual([
      { id: '8', runId: null },
      { id: '9', runId: null },
    ]);
  });

  it('merges failed jobs across queues, newest first, and keeps the latest 20', async () => {
    bull.getFailed.mockImplementation(async (name) => {
      const offset = name === RUN_QUEUE ? 0 : name === DIRECT_REPLY_QUEUE ? 1 : 2;
      return Array.from({ length: 10 }, (_, index) => {
        const at = (10 - index) * 3 + offset;
        return failedJob(`${name}-${at}`, at, { ...job });
      });
    });

    const { failedJobs } = await inspectQueues();

    expect(failedJobs).toHaveLength(20);
    expect(failedJobs.slice(0, 3).map(({ id }) => id)).toEqual([
      `${CLARIFYING_QUESTION_TIMEOUT_QUEUE}-32`,
      `${DIRECT_REPLY_QUEUE}-31`,
      `${RUN_QUEUE}-30`,
    ]);
    const times = failedJobs.map(({ failedAt }) => failedAt.getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });
});
