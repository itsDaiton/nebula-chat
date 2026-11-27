import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '@server/test/app';
import { adminSession, adminWithout2FASession, registeredSession } from '@server/test/session';

// ADR-0008: only the repositories are faked; the gate, validation and error handler are real.
vi.mock('@server/modules/admin/admin.repository', () => ({
  adminRepository: { listRuns: vi.fn() },
}));

vi.mock('@server/modules/audit/audit.repository', () => ({
  auditRepository: { insert: vi.fn(), list: vi.fn() },
}));

vi.mock('@server/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));

vi.mock('@server/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));

import { auth } from '@server/auth';
import { adminRepository } from '@server/modules/admin/admin.repository';
import { auditRepository } from '@server/modules/audit/audit.repository';

const repo = vi.mocked(adminRepository);
const audit = vi.mocked(auditRepository);
const mockedGetSession = vi.mocked(auth.api.getSession);

const COOKIE = { cookie: 'better-auth.session_token=abc' };
const RUN_ID = '77777777-7777-4777-8777-777777777777';
const USER_ID = '44444444-4444-4444-8444-444444444444';
const SESSION_ID = '55555555-5555-4555-8555-555555555555';
const STARTED_AT = new Date('2026-10-27T21:14:00.000Z');
const RUNS = '/api/admin/runs';

const aRun = (overrides: Record<string, unknown> = {}) => ({
  id: RUN_ID,
  status: 'partial',
  startedAt: STARTED_AT,
  finishedAt: new Date('2026-10-27T21:14:41.200Z'),
  stepCount: 9,
  tokensUsed: 38_410,
  tokenBudget: 60_000,
  costUsd: 0.031,
  owner: { id: USER_ID, name: 'David', email: 'david@example.com' },
  session: { id: SESSION_ID, title: 'Should we move replies' },
  ...overrides,
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
  mockedGetSession.mockResolvedValue(adminSession() as never);
  repo.listRuns.mockResolvedValue({
    runs: [aRun()],
    nextCursor: RUN_ID,
    hasMore: true,
  } as never);
});

describe('GET /api/admin/runs', () => {
  it('lists Runs across Users, shaped for the table, with no email and no Audit entry', async () => {
    const res = await app.inject({ method: 'GET', url: `${RUNS}?limit=5`, headers: COOKIE });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      runs: [
        {
          id: RUN_ID,
          status: 'partial',
          startedAt: '2026-10-27T21:14:00.000Z',
          durationMs: 41_200,
          stepCount: 9,
          tokensUsed: 38_410,
          tokenBudget: 60_000,
          costUsd: 0.031,
          owner: { id: USER_ID, name: 'David' },
          session: { id: SESSION_ID, title: 'Should we move replies' },
        },
      ],
      nextCursor: RUN_ID,
      hasMore: true,
    });
    expect(res.body).not.toContain('david@example.com');
    expect(repo.listRuns).toHaveBeenCalledWith(
      { sortBy: 'startedAt', order: 'desc' },
      5,
      undefined,
    );
    expect(audit.insert).not.toHaveBeenCalled();
  });

  it('shows no duration for in-flight Runs and a null cost without Model calls', async () => {
    repo.listRuns.mockResolvedValue({
      runs: ['queued', 'running', 'waiting'].map((status) =>
        aRun({ status, finishedAt: null, costUsd: null, tokenBudget: null }),
      ),
      nextCursor: null,
      hasMore: false,
    } as never);

    const res = await app.inject({ method: 'GET', url: RUNS, headers: COOKIE });

    expect(res.statusCode).toBe(200);
    for (const run of res.json().runs) {
      expect(run).toMatchObject({ durationMs: null, costUsd: null, tokenBudget: null });
    }
  });

  it('passes statuses, owner, date range, sort and cursor on', async () => {
    const query = new URLSearchParams([
      ['status', 'failed'],
      ['status', 'partial'],
      ['userId', USER_ID],
      ['from', '2026-09-28T00:00:00.000Z'],
      ['to', '2026-10-28T00:00:00.000Z'],
      ['sortBy', 'cost'],
      ['order', 'asc'],
      ['cursor', RUN_ID],
    ]);

    const res = await app.inject({ method: 'GET', url: `${RUNS}?${query}`, headers: COOKIE });

    expect(res.statusCode).toBe(200);
    expect(repo.listRuns).toHaveBeenCalledWith(
      {
        status: ['failed', 'partial'],
        userId: USER_ID,
        from: new Date('2026-09-28T00:00:00.000Z'),
        to: new Date('2026-10-28T00:00:00.000Z'),
        sortBy: 'cost',
        order: 'asc',
      },
      expect.any(Number),
      RUN_ID,
    );
  });

  it('accepts a single status given once', async () => {
    const res = await app.inject({ method: 'GET', url: `${RUNS}?status=running`, headers: COOKIE });

    expect(res.statusCode).toBe(200);
    expect(repo.listRuns).toHaveBeenCalledWith(
      expect.objectContaining({ status: ['running'] }),
      expect.any(Number),
      undefined,
    );
  });

  it('rejects an invalid query', async () => {
    for (const query of [
      'status=nope',
      'userId=nope',
      'sortBy=title',
      'order=sideways',
      'from=x',
    ]) {
      const res = await app.inject({ method: 'GET', url: `${RUNS}?${query}`, headers: COOKIE });
      expect(res.statusCode).toBe(400);
    }
    expect(repo.listRuns).not.toHaveBeenCalled();
  });

  it('refuses a non-Admin and an Admin without two-factor', async () => {
    mockedGetSession.mockResolvedValue(registeredSession() as never);
    expect((await app.inject({ method: 'GET', url: RUNS, headers: COOKIE })).statusCode).toBe(404);

    mockedGetSession.mockResolvedValue(adminWithout2FASession() as never);
    const res = await app.inject({ method: 'GET', url: RUNS, headers: COOKIE });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ error: 'TwoFactorRequired' });
    expect(repo.listRuns).not.toHaveBeenCalled();
  });

  it('refuses a request without a session', async () => {
    mockedGetSession.mockResolvedValue(null as never);

    expect((await app.inject({ method: 'GET', url: RUNS })).statusCode).toBe(401);
  });
});
