import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { captureLogger, eventLines } from '@nebula-chat/otel/testing';
import { createTestApp } from '@server/test/app';

// env.ts parses on first import; 1 ms is a limit a short busy-wait is sure to exceed.
process.env['MAX_EVENT_LOOP_DELAY_MS'] = '1';

vi.mock('@server/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));
vi.mock('@server/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));

// The plugin samples the real event loop and takes no injectable probe, so the test blocks it.
const blockEventLoop = (ms: number): void => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // Busy-wait.
  }
};

const capture = captureLogger('info');
let app: FastifyInstance;

beforeAll(async () => {
  app = await createTestApp({ logger: capture.logger });
  await vi.waitFor(
    () => {
      blockEventLoop(50);
      expect(app.isUnderPressure()).toBe(true);
    },
    { timeout: 5_000, interval: 50 },
  );
});

afterAll(async () => {
  await app.close();
});

describe('load shedding under event loop pressure', () => {
  it('still answers 200 on /health', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
  });

  it('sheds another route with a 503 and a Retry-After', async () => {
    const res = await app.inject({ method: 'GET', url: '/' });

    expect(res.statusCode).toBe(503);
    expect(res.headers['retry-after']).toBe('10');
  });

  it('logs the measured delay on the failed request line', async () => {
    await app.inject({ method: 'GET', url: '/' });

    expect(eventLines(capture.lines, 'http.request.failed').at(-1)?.['err']).toMatchObject({
      code: 'FST_UNDER_PRESSURE',
      message: expect.stringMatching(/eventLoopDelay \d+ ms over the 1 ms limit/),
    });
  });
});
