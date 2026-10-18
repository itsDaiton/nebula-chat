import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { listenForLogLevelChanges } from '@nebula-chat/otel';
import { createTestApp } from '@backend/test/app';
import { captureLogger, eventLines } from '@backend/test/logCapture';
import type { LogLine } from '@backend/test/logCapture';
import { memoryPubSub } from '@backend/test/memoryPubSub';
import { guestSession, registeredSession } from '@backend/test/session';

// No database in a unit test; this also keeps the real pg Pool out of the process.
vi.mock('@backend/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));

// Faked so a Guest or Registered session can be presented; the operator gate
// must ignore it either way.
vi.mock('@backend/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));

// @backend/redis is the boundary to Redis. Each test swaps in a fresh in-memory
// pubsub, so a published change reaches exactly the instances that test starts.
vi.mock('@backend/redis', () => ({
  redis: { cache: {}, connection: {}, close: vi.fn(async () => undefined) },
  closeRedis: vi.fn(async () => undefined),
}));

import { auth } from '@backend/auth';
import { env } from '@backend/env';
import { redis } from '@backend/redis';

const mockedGetSession = vi.mocked(auth.api.getSession);

const ROUTE = '/api/internal/log-level';
const OPERATOR = { authorization: `Bearer ${env.OPERATOR_TOKEN}` };
const NOW = new Date('2026-10-02T09:00:00.000Z');

let app: FastifyInstance;
/** The lines the one running server instance writes. */
let lines: LogLine[];

/** Starts one more server instance listening for level changes. */
const startInstance = async (): Promise<LogLine[]> => {
  const instance = captureLogger('info');
  await listenForLogLevelChanges({
    logger: instance.logger,
    pubsub: redis.pubsub,
    serviceName: 'nebula-chat-server',
  });
  return instance.lines;
};

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'], now: NOW });
  redis.pubsub = memoryPubSub();
  lines = await startInstance();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('POST /api/internal/log-level', () => {
  it('changes the level on every listening server instance and records who asked', async () => {
    const res = await app.inject({
      method: 'POST',
      url: ROUTE,
      headers: OPERATOR,
      payload: { level: 'debug', ttlSeconds: 600, operator: 'ada' },
    });

    expect(res.statusCode).toBe(202);
    expect(res.json()).toEqual({ receivers: 1, expiresAt: '2026-10-02T09:10:00.000Z' });
    expect(eventLines(lines, 'log.level.changed')).toEqual([
      expect.objectContaining({
        'nebula.log.target': 'root',
        'nebula.log.level.from': 'info',
        'nebula.log.level.to': 'debug',
        'nebula.log.level.expires_at': '2026-10-02T09:10:00.000Z',
        'nebula.operator': 'ada',
      }),
    ]);
  });

  it('reaches every instance of the server, and says how many', async () => {
    const second = await startInstance();

    const res = await app.inject({
      method: 'POST',
      url: ROUTE,
      headers: OPERATOR,
      payload: { level: 'debug', operator: 'ada' },
    });

    expect(res.json()).toMatchObject({ receivers: 2 });
    expect(eventLines(lines, 'log.level.changed')).toHaveLength(1);
    expect(eventLines(second, 'log.level.changed')).toHaveLength(1);
  });

  it('changes one component when the body names it, for 15 minutes by default', async () => {
    const res = await app.inject({
      method: 'POST',
      url: ROUTE,
      headers: OPERATOR,
      payload: { component: 'redis', level: 'trace', operator: 'ada' },
    });

    expect(res.json()).toMatchObject({ expiresAt: '2026-10-02T09:15:00.000Z' });
    expect(eventLines(lines, 'log.level.changed')).toEqual([
      expect.objectContaining({ 'nebula.log.target': 'redis', 'nebula.log.level.to': 'trace' }),
    ]);
  });

  it.each([
    ['a Guest', guestSession, {}],
    ['a Registered user', registeredSession, {}],
    ['a wrong operator token', registeredSession, { authorization: 'Bearer not-the-token' }],
    [
      'a token in another scheme',
      registeredSession,
      { authorization: `Basic ${env.OPERATOR_TOKEN}` },
    ],
  ])('answers Forbidden to %s and changes nothing', async (_who, session, headers) => {
    mockedGetSession.mockResolvedValue(session() as never);

    const res = await app.inject({
      method: 'POST',
      url: ROUTE,
      headers: { cookie: 'better-auth.session_token=abc', ...headers },
      payload: { level: 'debug', operator: 'ada' },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ success: false, error: 'Forbidden' });
    expect(eventLines(lines, 'log.level.changed')).toEqual([]);
  });

  it('answers Forbidden before validating the body, so a non-operator learns nothing of it', async () => {
    const res = await app.inject({ method: 'POST', url: ROUTE, payload: { level: 'loud' } });

    expect(res.statusCode).toBe(403);
  });

  it('answers exactly as a route that does not exist while no operator token is configured', async () => {
    const missing = await app.inject({ method: 'POST', url: '/api/internal/nothing-here' });
    const token = env.OPERATOR_TOKEN;
    env.OPERATOR_TOKEN = undefined;
    try {
      const res = await app.inject({
        method: 'POST',
        url: ROUTE,
        headers: OPERATOR,
        payload: { level: 'debug', operator: 'ada' },
      });

      expect(res.statusCode).toBe(404);
      expect(res.body).toBe(missing.body.replace('/api/internal/nothing-here', ROUTE));
    } finally {
      env.OPERATOR_TOKEN = token;
    }
  });

  it.each([
    ['an unknown level', { level: 'loud', operator: 'ada' }],
    ['an unknown component', { component: 'billing', level: 'debug', operator: 'ada' }],
    ['an expiry past four hours', { level: 'debug', ttlSeconds: 14_401, operator: 'ada' }],
    ['no operator name', { level: 'debug' }],
    ['a blank operator name', { level: 'debug', operator: '  ' }],
  ])('rejects %s', async (_case, payload) => {
    const res = await app.inject({ method: 'POST', url: ROUTE, headers: OPERATOR, payload });

    expect(res.statusCode).toBe(400);
    expect(eventLines(lines, 'log.level.changed')).toEqual([]);
  });
});
