import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '@server/test/app';
import { adminSession, adminWithout2FASession, registeredSession } from '@server/test/session';

vi.mock('@server/modules/admin/admin.repository', () => ({
  adminRepository: { overviewCounts: vi.fn() },
}));

vi.mock('@server/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));

vi.mock('@server/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));

import { auth } from '@server/auth';
import { adminRepository } from '@server/modules/admin/admin.repository';

const repo = vi.mocked(adminRepository);
const mockedGetSession = vi.mocked(auth.api.getSession);

const COOKIE = { cookie: 'better-auth.session_token=abc' };
const OVERVIEW = '/api/admin/overview';

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
  repo.overviewCounts.mockResolvedValue({
    dailyActive: [],
    weeklyActive: [],
    registrations: [],
    conversions: [],
    guests: [],
    messages: [],
  });
});

describe('GET /api/admin/overview', () => {
  it('returns the series and totals of each KPI, 30 days by default', async () => {
    const res = await app.inject({ method: 'GET', url: OVERVIEW, headers: COOKIE });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.range).toBe('30d');
    expect(body.days).toHaveLength(30);
    expect(Object.keys(body.kpis).sort()).toEqual([
      'dailyActiveUsers',
      'guestConversion',
      'messagesSent',
      'newRegistrations',
      'weeklyActiveUsers',
    ]);
    expect(body.kpis.messagesSent).toEqual({
      total: 0,
      previousTotal: 0,
      series: Array.from({ length: 30 }, () => 0),
    });
    expect(body.kpis.guestConversion.rate).toBeNull();
  });

  it('honours the range', async () => {
    const res = await app.inject({ method: 'GET', url: `${OVERVIEW}?range=7d`, headers: COOKIE });

    expect(res.statusCode).toBe(200);
    expect(res.json().days).toHaveLength(7);
  });

  it('rejects an unknown range', async () => {
    const res = await app.inject({ method: 'GET', url: `${OVERVIEW}?range=1y`, headers: COOKIE });

    expect(res.statusCode).toBe(400);
    expect(repo.overviewCounts).not.toHaveBeenCalled();
  });

  it('refuses a non-Admin and an Admin without two-factor', async () => {
    mockedGetSession.mockResolvedValue(registeredSession() as never);
    expect((await app.inject({ method: 'GET', url: OVERVIEW, headers: COOKIE })).statusCode).toBe(
      403,
    );

    mockedGetSession.mockResolvedValue(adminWithout2FASession() as never);
    const res = await app.inject({ method: 'GET', url: OVERVIEW, headers: COOKIE });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ error: 'TwoFactorRequired' });
    expect(repo.overviewCounts).not.toHaveBeenCalled();
  });

  it('refuses a request without a session', async () => {
    mockedGetSession.mockResolvedValue(null as never);

    expect((await app.inject({ method: 'GET', url: OVERVIEW })).statusCode).toBe(401);
  });
});
