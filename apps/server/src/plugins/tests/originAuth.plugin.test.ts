import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '@server/test/app';

const SECRET = 'origin-auth-secret-0123456789abcdef';
// env.ts parses on first import.
process.env['ORIGIN_AUTH_SECRET'] = SECRET;

vi.mock('@server/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));
vi.mock('@server/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));

let app: FastifyInstance;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

describe('requests that bypass Cloudflare', () => {
  it.each([
    ['no X-Origin-Auth', {}],
    ['a wrong X-Origin-Auth', { 'x-origin-auth': 'not-the-secret' }],
    ['a forged CF-Connecting-IP and no X-Origin-Auth', { 'cf-connecting-ip': '203.0.113.9' }],
  ])('refuses a request with %s', async (_case, headers) => {
    const res = await app.inject({ method: 'GET', url: '/', headers });

    expect(res.statusCode).toBe(403);
  });

  it('still answers /health, which Render probes without the header', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
  });
});

describe('requests through Cloudflare', () => {
  it('passes a request carrying the secret', async () => {
    const res = await app.inject({ method: 'GET', url: '/', headers: { 'x-origin-auth': SECRET } });

    expect(res.statusCode).toBe(200);
  });
});
