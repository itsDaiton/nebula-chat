import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  MODEL_CATALOG,
  MODEL_CATALOG_HASH,
  MODEL_CATALOG_VERSION,
  MODEL_IDS,
} from '@nebula-chat/contracts';
import { createTestApp } from '@server/test/app';

// No database in a unit test; this also keeps the real pg Pool out of the process.
vi.mock('@server/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));

// The catalog is public, so the gate must never be consulted; faking `@server/auth` lets the test prove it.
vi.mock('@server/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));

vi.mock('@server/redis', async () => {
  const { replyStreamsModule } = await import('@server/test/memoryReplyStreams.js');
  return {
    redis: { connection: {}, close: vi.fn(async () => undefined) },
    closeRedis: vi.fn(async () => undefined),
    ...replyStreamsModule,
  };
});

import { auth } from '@server/auth';

let app: FastifyInstance;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

describe('GET /api/models', () => {
  it('serves the catalog to a caller with no session', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/models' });

    expect(res.statusCode).toBe(200);
    expect(auth.api.getSession).not.toHaveBeenCalled();
    expect(res.json<{ models: { id: string }[] }>().models.map((model) => model.id)).toEqual([
      ...MODEL_IDS,
    ]);
  });

  it('describes each Model with its label, provider, limits and prices', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/models' });

    expect(res.json<{ models: unknown[] }>().models).toContainEqual({
      id: 'gpt-4.1-mini',
      label: 'GPT-4.1 mini',
      provider: 'openai',
      contextWindow: 1_047_576,
      maxOutput: 32_768,
      prices: { input: 0.4, cachedInput: 0.1, output: 1.6 },
    });
  });

  it('serves exactly what the catalog holds', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/models' });

    expect(res.json<{ models: unknown }>().models).toEqual(MODEL_CATALOG);
  });

  it('says which version of the catalog it is, with the hash of its content', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/models' });

    expect(res.json()).toMatchObject({ version: MODEL_CATALOG_VERSION, hash: MODEL_CATALOG_HASH });
  });

  it('lets any cache keep the catalog for an hour', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/models' });

    expect(res.headers['cache-control']).toBe('public, max-age=3600');
  });
});
