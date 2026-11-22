import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '@server/test/app';

// env.ts parses on first import, so the origins are set before the app loads.
process.env['CLIENT_URL'] = 'https://app.example.com';
process.env['SERVER_URL'] = 'https://api.example.com';
process.env['API_DOCS_ENABLED'] = 'true';

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

describe('security headers', () => {
  it.each([
    ['a JSON 200', 'GET', '/health'],
    ['a 404', 'GET', '/no-such-route'],
    ['an error response', 'POST', '/api/sessions'],
  ])('are sent on %s', async (_case, method, url) => {
    const res = await app.inject({ method: method as 'GET' | 'POST', url });

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['content-security-policy']).toBe(
      "default-src 'none';frame-ancestors 'none'",
    );
  });

  it('leaves HSTS to production', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.headers['strict-transport-security']).toBeUndefined();
  });

  it('serves the Swagger UI page itself', async () => {
    const res = await app.inject({ method: 'GET', url: '/docs' });

    expect([200, 302]).toContain(res.statusCode);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('lets an allowed-Origin mutation through to better-auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/anonymous',
      headers: { origin: 'https://app.example.com' },
      payload: {},
    });

    expect(res.statusCode).not.toBe(403);
  });

  it('relaxes the CSP for Swagger UI only, still denying framing', async () => {
    const res = await app.inject({ method: 'GET', url: '/docs/static/index.html' });

    const csp = String(res.headers['content-security-policy']);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain('upgrade-insecure-requests');
  });
});

describe('Origin check on mutations', () => {
  it.each(['POST', 'PUT', 'PATCH', 'DELETE'] as const)(
    'answers 403 to a %s from a foreign Origin',
    async (method) => {
      const res = await app.inject({
        method,
        url: '/api/sessions',
        headers: { origin: 'https://evil.example.com' },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json()).toMatchObject({ success: false, error: 'Forbidden' });
    },
  );

  it('answers 403 to Origin: null', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      headers: { origin: 'null' },
    });

    expect(res.statusCode).toBe(403);
  });

  it.each([
    ['an allowed Origin', { origin: 'https://app.example.com' }],
    ['no Origin', {}],
  ])('lets a mutation with %s reach the route', async (_case, headers) => {
    const res = await app.inject({ method: 'POST', url: '/api/sessions', headers });

    expect(res.statusCode).not.toBe(403);
  });

  it('does not apply to GET with a foreign Origin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://evil.example.com' },
    });

    expect(res.statusCode).toBe(200);
  });

  it('does not apply to a CORS preflight', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/api/sessions',
      headers: {
        origin: 'https://app.example.com',
        'access-control-request-method': 'POST',
      },
    });

    expect(res.statusCode).toBe(204);
  });
});
