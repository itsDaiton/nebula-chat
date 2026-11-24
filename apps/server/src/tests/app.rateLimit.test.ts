import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '@server/test/app';
import { registeredSession } from '@server/test/session';

vi.mock('@server/modules/session/session.repository', () => ({
  sessionRepository: { create: vi.fn() },
}));
vi.mock('@server/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));
vi.mock('@server/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));
vi.mock('@server/redis', () => ({
  redis: { cache: {}, connection: {}, close: vi.fn(async () => undefined) },
  closeRedis: vi.fn(async () => undefined),
}));

import { auth } from '@server/auth';
import { sessionRepository } from '@server/modules/session/session.repository';

const mockedGetSession = vi.mocked(auth.api.getSession);

let app: FastifyInstance;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  mockedGetSession.mockResolvedValue(registeredSession() as never);
  vi.mocked(sessionRepository.create).mockResolvedValue({
    id: '11111111-1111-4111-8111-111111111111',
    title: 't',
    createdAt: new Date(),
  } as never);
});

// The limiter keeps its counters for the life of the app, so each test owns its client IP.
const statuses = async (
  count: number,
  request: (i: number) => Promise<{ statusCode: number }>,
): Promise<number[]> => {
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push((await request(i)).statusCode);
  return out;
};

describe('rate limits keyed on cf-connecting-ip', () => {
  it('answers 429 with the error envelope and Retry-After past 10 operator requests a minute, whatever the token', async () => {
    const headers = { 'cf-connecting-ip': '198.51.100.1', authorization: 'Bearer wrong' };
    const all = await statuses(10, () =>
      app.inject({ method: 'GET', url: '/api/internal/log-level', headers }),
    );
    const res = await app.inject({ method: 'GET', url: '/api/internal/log-level', headers });

    expect(all.every((status) => status === 404)).toBe(true);
    expect(res.statusCode).toBe(429);
    expect(res.json()).toMatchObject({ success: false, error: 'TooManyRequests' });
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('shares one bucket across the /api/internal routes', async () => {
    const headers = { 'cf-connecting-ip': '198.51.100.2' };
    await statuses(10, () =>
      app.inject({ method: 'GET', url: '/api/internal/log-level', headers }),
    );

    const res = await app.inject({ method: 'GET', url: '/api/internal/admins', headers });

    expect(res.statusCode).toBe(429);
  });

  it('shares a bucket between requests with different X-Forwarded-For and one cf-connecting-ip', async () => {
    const results = await statuses(11, (i) =>
      app.inject({
        method: 'GET',
        url: '/api/internal/log-level',
        remoteAddress: `10.9.0.${i + 1}`,
        headers: { 'cf-connecting-ip': '198.51.100.3', 'x-forwarded-for': `203.0.113.${i + 1}` },
      }),
    );

    expect(results[10]).toBe(429);
  });

  it('keeps a different client IP in its own bucket', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/internal/log-level',
      headers: { 'cf-connecting-ip': '198.51.100.4' },
    });

    expect(res.statusCode).not.toBe(429);
  });

  it('falls back to the connection address without cf-connecting-ip', async () => {
    const results = await statuses(11, () =>
      app.inject({ method: 'GET', url: '/api/internal/log-level', remoteAddress: '10.8.0.1' }),
    );

    expect(results[10]).toBe(429);
  });

  it('answers 429 past 120 admin requests a minute', async () => {
    const headers = { 'cf-connecting-ip': '198.51.100.5' };
    const results = await statuses(121, () =>
      app.inject({ method: 'GET', url: '/api/admin/overview', headers }),
    );

    expect(results.slice(0, 120).every((status) => status !== 429)).toBe(true);
    expect(results[120]).toBe(429);
  });

  it('answers 429 with Retry-After past 30 Session creations a minute', async () => {
    const request = () =>
      app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { 'cf-connecting-ip': '198.51.100.6' },
        payload: { title: 't' },
      });
    const results = await statuses(30, request);
    const res = await request();

    expect(results.every((status) => status !== 429)).toBe(true);
    expect(res.statusCode).toBe(429);
    expect(res.headers['retry-after']).toBeDefined();
  });
});
