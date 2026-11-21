import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '@server/test/app';

// env.ts parses on first import, so the flag is set before the app loads.
process.env['API_DOCS_ENABLED'] = 'false';
process.env['SERVER_URL'] = 'https://api.example.com';
process.env['CLIENT_URL'] = 'https://app.example.com';

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

describe('API docs off', () => {
  it.each(['/docs', '/docs/', '/docs/json', '/docs/static/index.html', '/openapi.json'])(
    'answers 404 on %s',
    async (url) => {
      const res = await app.inject({ method: 'GET', url });

      expect(res.statusCode).toBe(404);
    },
  );

  it('still builds the document every route feeds, for generate:openapi', () => {
    const document = app.swagger() as unknown as { paths: Record<string, unknown> };

    expect(Object.keys(document.paths)).toContain('/health');
    expect(Object.keys(document.paths).length).toBeGreaterThan(10);
  });

  it.each([
    ['SERVER_URL', 'https://api.example.com', false],
    ['CLIENT_URL', 'https://app.example.com', true],
  ])('echoes the origin of a preflight from %s: %s', async (_name, origin, allowed) => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/api/sessions',
      headers: { origin, 'access-control-request-method': 'GET' },
    });

    expect(res.headers['access-control-allow-origin'] === origin).toBe(allowed);
  });
});
