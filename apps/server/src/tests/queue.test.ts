import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DIRECT_REPLY_QUEUE, RUN_QUEUE } from '@nebula-chat/contracts';
import { captureLogger, captureSpans, eventLines, LEVEL } from '@nebula-chat/otel/testing';

const bull = vi.hoisted(() => ({
  constructed: [] as { name: string; options: unknown }[],
  add: vi.fn(async () => ({ id: '1' })),
  close: vi.fn(async () => undefined),
}));

// BullMQ is the boundary: a Queue that records what it is given.
vi.mock('bullmq', () => ({
  Queue: class {
    add = bull.add;
    close = bull.close;
    constructor(name: string, options: unknown) {
      bull.constructed.push({ name, options });
    }
  },
}));

vi.mock('@server/redis', () => ({
  redis: { dedicatedConnection: vi.fn(() => ({ dedicated: true })) },
}));

import { withSpan } from '@nebula-chat/otel';
import { closeQueue, enqueueDirectReply, enqueueRun, pingWorker } from '@server/queue';

const job = {
  userId: '11111111-1111-4111-8111-111111111111',
  sessionId: '22222222-2222-4222-8222-222222222222',
  messageId: '33333333-3333-4333-8333-333333333333',
  streamId: '44444444-4444-4444-8444-444444444444',
};

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
    expect(bull.add).toHaveBeenCalledWith('run', {
      ...runJob,
      traceparent: expect.stringMatching(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/),
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

describe('pingWorker', () => {
  it('logs a failed ping as a warning and never rejects', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const { logger, lines } = captureLogger();

    await expect(pingWorker(logger)).resolves.toBeUndefined();
    expect(eventLines(lines, 'worker.ping.failed')).toMatchObject([{ level: LEVEL.warn }]);
  });

  it('counts an unhealthy answer as a failed ping', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 503 }));
    const { logger, lines } = captureLogger();

    await pingWorker(logger);

    expect(eventLines(lines, 'worker.ping.failed')).toMatchObject([
      { err: expect.objectContaining({ message: 'Worker /health answered 503' }) },
    ]);
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
