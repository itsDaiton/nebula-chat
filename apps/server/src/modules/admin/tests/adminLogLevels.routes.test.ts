import type { FastifyInstance } from 'fastify';
import { fromPartial } from '@total-typescript/shoehorn';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { listenForLogLevelChanges } from '@nebula-chat/otel';
import { captureLogger, eventLines } from '@nebula-chat/otel/testing';
import type { LogLine } from '@nebula-chat/otel/testing';
import { createTestApp } from '@server/test/app';
import { memoryPubSub } from '@server/test/memoryPubSub';
import {
  ADMIN_USER_ID,
  adminSession,
  adminWithout2FASession,
  registeredSession,
} from '@server/test/session';

vi.mock('@server/modules/audit/audit.repository', () => ({
  auditRepository: { insert: vi.fn(), list: vi.fn() },
}));

vi.mock('@server/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));

vi.mock('@server/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));

// Each test swaps in a fresh in-memory pubsub, so a change reaches exactly the instances it starts.
vi.mock('@server/redis', () => ({
  redis: { cache: {}, connection: {}, close: vi.fn(async () => undefined) },
  closeRedis: vi.fn(async () => undefined),
}));

import { auth } from '@server/auth';
import { env } from '@server/env';
import { auditRepository } from '@server/modules/audit/audit.repository';
import { redis } from '@server/redis';

const audit = vi.mocked(auditRepository);
const mockedGetSession = vi.mocked(auth.api.getSession);

const ROUTE = '/api/admin/log-levels';
const COOKIE = { cookie: 'better-auth.session_token=abc' };
const NOW = new Date('2026-10-02T09:00:00.000Z');

const ada = () => {
  const session = adminSession();
  return fromPartial({ ...session, user: { ...session.user, name: 'Ada Admin' } });
};

let app: FastifyInstance;
let server: LogLine[];
let instances = 0;

const startInstance = async (
  level: 'info' | 'debug' = 'info',
  serviceName = 'nebula-chat-server',
) => {
  instances += 1;
  const instance = captureLogger(level);
  await listenForLogLevelChanges({
    logger: instance.logger,
    pubsub: redis.pubsub,
    serviceName,
    instanceId: `web-${instances}`,
  });
  return instance.lines;
};

const change = (payload: Record<string, unknown>) =>
  app.inject({ method: 'POST', url: ROUTE, headers: COOKIE, payload });

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'], now: NOW });
  mockedGetSession.mockResolvedValue(ada() as never);
  audit.insert.mockResolvedValue(undefined);
  redis.pubsub = memoryPubSub();
  instances = 0;
  server = await startInstance();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GET /api/admin/log-levels', () => {
  it('reports every server instance, with who set a temporary change and when it reverts', async () => {
    await change({ component: 'redis', level: 'trace', ttlSeconds: 600 });

    const res = await app.inject({ method: 'GET', url: ROUTE, headers: COOKIE });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      receivers: 1,
      reports: [
        {
          instance: 'web-1',
          levels: expect.arrayContaining([
            { target: 'root', level: 'info', expiresAt: null, operator: null },
            {
              target: 'redis',
              level: 'trace',
              expiresAt: '2026-10-02T09:10:00.000Z',
              operator: 'Ada Admin',
            },
          ]),
        },
      ],
    });
  });

  it('reports the worker when asked, and writes no Audit entry', async () => {
    await startInstance('debug', 'nebula-chat-worker');

    const res = await app.inject({
      method: 'GET',
      url: `${ROUTE}?service=worker`,
      headers: COOKIE,
    });

    expect(res.json()).toMatchObject({
      receivers: 1,
      reports: [
        {
          instance: 'web-2',
          levels: expect.arrayContaining([
            expect.objectContaining({ target: 'root', level: 'debug' }),
          ]),
        },
      ],
    });
    expect(audit.insert).not.toHaveBeenCalled();
  });

  it('rejects an unknown service', async () => {
    const res = await app.inject({ method: 'GET', url: `${ROUTE}?service=redis`, headers: COOKIE });

    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/admin/log-levels', () => {
  it('changes the level under the Admin’s name and audits it first', async () => {
    const res = await change({ service: 'server', level: 'debug', ttlSeconds: 600 });

    expect(res.statusCode).toBe(202);
    expect(res.json()).toEqual({ receivers: 1, expiresAt: '2026-10-02T09:10:00.000Z' });
    expect(eventLines(server, 'log.level.changed')).toEqual([
      expect.objectContaining({
        'nebula.log.target': 'root',
        'nebula.log.level.to': 'debug',
        'nebula.operator': 'Ada Admin',
      }),
    ]);
    expect(audit.insert).toHaveBeenCalledWith({
      actorType: 'admin',
      actorUserId: ADMIN_USER_ID,
      action: 'log_level.changed',
      targetType: 'service',
      targetId: 'server',
      detail: { service: 'server', target: 'root', level: 'debug', ttlSeconds: 600 },
    });
  });

  it('changes one worker component for 15 minutes by default', async () => {
    const worker = await startInstance('info', 'nebula-chat-worker');

    const res = await change({ service: 'worker', component: 'llm', level: 'trace' });

    expect(res.json()).toMatchObject({ receivers: 1, expiresAt: '2026-10-02T09:15:00.000Z' });
    expect(eventLines(worker, 'log.level.changed')).toEqual([
      expect.objectContaining({ 'nebula.log.target': 'llm', 'nebula.log.level.to': 'trace' }),
    ]);
    expect(eventLines(server, 'log.level.changed')).toEqual([]);
    expect(audit.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        targetId: 'worker',
        detail: { service: 'worker', target: 'llm', level: 'trace', ttlSeconds: 900 },
      }),
    );
  });

  it('never takes the operator from the body', async () => {
    await change({ level: 'debug', operator: 'mallory' });

    expect(eventLines(server, 'log.level.changed')).toEqual([
      expect.objectContaining({ 'nebula.operator': 'Ada Admin' }),
    ]);
  });

  it('broadcasts nothing when the Audit write fails', async () => {
    audit.insert.mockRejectedValue(new Error('db down'));

    const res = await change({ level: 'debug' });

    expect(res.statusCode).toBe(500);
    expect(eventLines(server, 'log.level.changed')).toEqual([]);
  });

  it('reverts a temporary change by letting it expire a second from now, audited the same way', async () => {
    await change({ component: 'redis', level: 'trace', ttlSeconds: 600 });
    audit.insert.mockClear();

    const res = await change({ service: 'server', component: 'redis', revert: true });

    expect(res.statusCode).toBe(202);
    expect(res.json()).toEqual({ receivers: 1, expiresAt: '2026-10-02T09:00:01.000Z' });
    expect(eventLines(server, 'log.level.changed').at(-1)).toMatchObject({
      'nebula.log.target': 'redis',
      'nebula.log.level.to': 'trace',
      'nebula.log.level.expires_at': '2026-10-02T09:00:01.000Z',
      'nebula.operator': 'Ada Admin',
    });
    expect(audit.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'log_level.changed',
        detail: { service: 'server', target: 'redis', level: 'trace', ttlSeconds: 1 },
      }),
    );
  });

  it('answers 409 to a revert with no temporary change, and audits nothing', async () => {
    const res = await change({ component: 'redis', revert: true });

    expect(res.statusCode).toBe(409);
    expect(audit.insert).not.toHaveBeenCalled();
    expect(eventLines(server, 'log.level.changed')).toEqual([]);
  });

  it.each([
    ['an unknown level', { level: 'loud' }],
    ['an unknown component', { component: 'billing', level: 'debug' }],
    ['an expiry past four hours', { level: 'debug', ttlSeconds: 14_401 }],
    ['an unknown service', { service: 'redis', level: 'debug' }],
    ['no level', {}],
  ])('rejects %s', async (_case, payload) => {
    const res = await change(payload);

    expect(res.statusCode).toBe(400);
    expect(audit.insert).not.toHaveBeenCalled();
    expect(eventLines(server, 'log.level.changed')).toEqual([]);
  });
});

describe('access', () => {
  it.each([
    ['GET', undefined],
    ['POST', { level: 'debug' }],
  ] as const)('%s refuses outsiders and an Admin without two-factor', async (method, payload) => {
    const request = { method, url: ROUTE, ...(payload && { payload }) };
    mockedGetSession.mockResolvedValue(null as never);
    expect((await app.inject(request)).statusCode).toBe(401);

    mockedGetSession.mockResolvedValue(registeredSession() as never);
    expect((await app.inject({ ...request, headers: COOKIE })).statusCode).toBe(404);

    mockedGetSession.mockResolvedValue(adminWithout2FASession() as never);
    const res = await app.inject({ ...request, headers: COOKIE });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ error: 'TwoFactorRequired' });
    expect(eventLines(server, 'log.level.changed')).toEqual([]);
  });

  it('leaves the operator route to the operator token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/internal/log-level',
      headers: COOKIE,
      payload: { level: 'debug', operator: 'ada' },
    });
    expect(res.statusCode).toBe(404);

    const operator = await app.inject({
      method: 'POST',
      url: '/api/internal/log-level',
      headers: { authorization: `Bearer ${env.OPERATOR_TOKEN}` },
      payload: { level: 'debug', operator: 'ada' },
    });
    expect(operator.statusCode).toBe(202);
    expect(audit.insert).not.toHaveBeenCalled();
  });
});
