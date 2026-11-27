import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '@server/test/app';
import { adminSession, adminWithout2FASession, registeredSession } from '@server/test/session';

vi.mock('@server/modules/usage/usage.repository', () => ({
  usageRepository: {
    promptsByDay: vi.fn(),
    callsByDay: vi.fn(),
    dayStats: vi.fn(),
    totals: vi.fn(),
    runsByDay: vi.fn(),
    agentCallsByDay: vi.fn(),
    agentTrendByDay: vi.fn(),
    agentDayStats: vi.fn(),
  },
}));

vi.mock('@server/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));

vi.mock('@server/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));

import { auth } from '@server/auth';
import { usageRepository } from '@server/modules/usage/usage.repository';

const repo = vi.mocked(usageRepository);
const mockedGetSession = vi.mocked(auth.api.getSession);

const COOKIE = { cookie: 'better-auth.session_token=abc' };
const USAGE = '/api/admin/usage';

let app: FastifyInstance;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetSession.mockResolvedValue(adminSession() as never);
  repo.promptsByDay.mockResolvedValue([]);
  repo.callsByDay.mockResolvedValue([]);
  repo.dayStats.mockResolvedValue({
    calls: 0,
    inputPerCall: null,
    outputPerCall: null,
    costPerCall: null,
    cacheReplays: 0,
    completionRate: null,
    avgDurationMs: null,
  });
  repo.totals.mockResolvedValue({
    prompts: 0,
    tokens: 0,
    spend: 0,
    activeUsers: 0,
    runs: 0,
    calls: 0,
    cacheReplays: 0,
    runSteps: 0,
    runCalls: 0,
    runTokens: 0,
    runSpend: 0,
    runDurationMs: null,
  });
  repo.runsByDay.mockResolvedValue([]);
  repo.agentCallsByDay.mockResolvedValue([]);
  repo.agentTrendByDay.mockResolvedValue([]);
  repo.agentDayStats.mockResolvedValue({
    calls: 0,
    inputPerCall: null,
    outputPerCall: null,
    costPerCall: null,
    cacheReplays: 0,
    completionRate: null,
    avgDurationMs: null,
  });
});

const get = (url: string) => app.inject({ method: 'GET', url, headers: COOKIE });

describe('GET /api/admin/usage/series', () => {
  it('returns the Prompts series over 30 days by default', async () => {
    repo.promptsByDay.mockResolvedValue([{ day: '2026-01-01', key: 'gpt-4o', value: 3 }]);

    const res = await get(`${USAGE}/series`);

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ metric: 'prompts', range: '30d' });
    expect(res.json().days).toHaveLength(30);
    expect(repo.callsByDay).not.toHaveBeenCalled();
  });

  it('reads Model calls for tokens and spend, and wraps a single models key', async () => {
    const res = await get(`${USAGE}/series?metric=spend&range=7d&audience=guests&models=gpt-4o`);

    expect(res.statusCode).toBe(200);
    expect(repo.callsByDay).toHaveBeenCalledWith(
      'spend',
      expect.any(String),
      expect.any(String),
      'guests',
      ['gpt-4o'],
    );
  });

  it.each(['metric=cost', 'range=1y', 'audience=bots'])('rejects %s', async (query) => {
    expect((await get(`${USAGE}/series?${query}`)).statusCode).toBe(400);
  });

  it('refuses a non-Admin and an Admin without two-factor', async () => {
    mockedGetSession.mockResolvedValue(registeredSession() as never);
    expect((await get(`${USAGE}/series`)).statusCode).toBe(404);

    mockedGetSession.mockResolvedValue(adminWithout2FASession() as never);
    const res = await get(`${USAGE}/series`);
    expect(res.json()).toMatchObject({ error: 'TwoFactorRequired' });
    expect(repo.promptsByDay).not.toHaveBeenCalled();
  });

  it('refuses a request without a session', async () => {
    mockedGetSession.mockResolvedValue(null as never);

    expect((await app.inject({ method: 'GET', url: `${USAGE}/series` })).statusCode).toBe(401);
  });
});

describe('GET /api/admin/usage/detail', () => {
  it('returns a Model’s day with its trend', async () => {
    const res = await get(`${USAGE}/detail?model=gpt-4o&day=2026-01-01&range=7d`);

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ model: 'gpt-4o', day: '2026-01-01', calls: 0 });
    expect(res.json().trend).toHaveLength(7);
  });

  it('requires a Model and a valid day', async () => {
    expect((await get(`${USAGE}/detail?day=2026-01-01`)).statusCode).toBe(400);
    expect((await get(`${USAGE}/detail?model=gpt-4o&day=yesterday`)).statusCode).toBe(400);
  });

  it('refuses a non-Admin', async () => {
    mockedGetSession.mockResolvedValue(registeredSession() as never);

    expect((await get(`${USAGE}/detail?model=gpt-4o&day=2026-01-01`)).statusCode).toBe(404);
  });
});

describe('GET /api/admin/usage/runs/series', () => {
  const today = new Date().toISOString().slice(0, 10);

  it('returns Runs by outcome and the Agent ranking, zero-filled', async () => {
    repo.runsByDay.mockResolvedValue([{ day: today, key: 'completed', value: 2 }]);
    repo.agentCallsByDay.mockResolvedValue([
      { day: today, key: 'orchestrator', spend: 0.5, tokens: 10 },
    ]);

    const res = await get(`${USAGE}/runs/series?range=7d&audience=guests`);

    expect(res.statusCode).toBe(200);
    expect(res.json().days).toHaveLength(7);
    expect(res.json().outcomes).toHaveLength(4);
    expect(res.json().agents).toMatchObject([{ key: 'orchestrator', tokensTotal: 10 }]);
    expect(repo.runsByDay).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'guests');
  });

  it.each(['range=1y', 'audience=bots'])('rejects %s', async (query) => {
    expect((await get(`${USAGE}/runs/series?${query}`)).statusCode).toBe(400);
  });

  it('refuses a non-Admin, an Admin without two-factor and a missing session', async () => {
    mockedGetSession.mockResolvedValue(registeredSession() as never);
    expect((await get(`${USAGE}/runs/series`)).statusCode).toBe(404);

    mockedGetSession.mockResolvedValue(adminWithout2FASession() as never);
    expect((await get(`${USAGE}/runs/series`)).json()).toMatchObject({
      error: 'TwoFactorRequired',
    });

    mockedGetSession.mockResolvedValue(null as never);
    expect((await app.inject({ method: 'GET', url: `${USAGE}/runs/series` })).statusCode).toBe(401);
    expect(repo.runsByDay).not.toHaveBeenCalled();
  });
});

describe('GET /api/admin/usage/runs/detail', () => {
  it('returns an Agent’s day with its trend', async () => {
    const res = await get(`${USAGE}/runs/detail?agent=writer&day=2026-01-01&range=7d`);

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ agent: 'writer', day: '2026-01-01', calls: 0 });
    expect(res.json().trend).toHaveLength(7);
  });

  it('requires an Agent and a valid day', async () => {
    expect((await get(`${USAGE}/runs/detail?day=2026-01-01`)).statusCode).toBe(400);
    expect((await get(`${USAGE}/runs/detail?agent=writer&day=yesterday`)).statusCode).toBe(400);
  });

  it('refuses a non-Admin', async () => {
    mockedGetSession.mockResolvedValue(registeredSession() as never);

    expect((await get(`${USAGE}/runs/detail?agent=writer&day=2026-01-01`)).statusCode).toBe(404);
  });
});

describe('GET /api/admin/usage/totals', () => {
  it('returns the totals with the previous period', async () => {
    const res = await get(`${USAGE}/totals?range=14d`);

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      range: '14d',
      prompts: { total: 0, previousTotal: 0 },
      cacheHitRate: { rate: null, previousRate: null },
      runAverages: { stepsPerRun: { value: null, previousValue: null } },
    });
    expect(repo.totals).toHaveBeenCalledTimes(2);
  });

  it('rejects an unknown range and refuses a non-Admin', async () => {
    expect((await get(`${USAGE}/totals?range=1y`)).statusCode).toBe(400);
    mockedGetSession.mockResolvedValue(registeredSession() as never);
    expect((await get(`${USAGE}/totals`)).statusCode).toBe(404);
  });
});
