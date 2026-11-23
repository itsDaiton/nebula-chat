import { constants, generateKeyPairSync, privateDecrypt } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '@server/test/app';
import {
  guestSession,
  REGISTERED_USER_ID,
  registeredSession,
  unverifiedSession,
} from '@server/test/session';

const state = vi.hoisted(() => ({
  config: null as { publicKey: string; version: number } | null,
  writes: new Map<string, number>(),
}));

vi.mock('@server/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));
vi.mock('@server/auth', () => ({ auth: { api: { getSession: vi.fn() }, handler: vi.fn() } }));
vi.mock('@server/redis', () => ({
  redis: {
    cache: {},
    connection: {},
    authStore: {
      increment: vi.fn(async (key: string) => {
        const next = (state.writes.get(key) ?? 0) + 1;
        state.writes.set(key, next);
        return next;
      }),
    },
    close: vi.fn(async () => undefined),
  },
  closeRedis: vi.fn(async () => undefined),
}));
vi.mock('@server/ownKeyConfig', () => ({
  get ownKeyConfig() {
    return state.config;
  },
}));
vi.mock('@server/queue', () => ({
  enqueueOwnKeyValidation: vi.fn(async () => undefined),
  closeQueue: vi.fn(async () => undefined),
}));
vi.mock('@server/modules/ownKey/ownKey.repository', () => ({
  ownKeyRepository: { list: vi.fn(), save: vi.fn(), remove: vi.fn(), findValid: vi.fn() },
}));

import { auth } from '@server/auth';
import { ownKeyRepository } from '@server/modules/ownKey/ownKey.repository';
import { enqueueOwnKeyValidation } from '@server/queue';

const repo = vi.mocked(ownKeyRepository);
const mockedGetSession = vi.mocked(auth.api.getSession);

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 4096,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const KEY_ID = '44444444-4444-4444-8444-444444444444';
const SECRET = 'sk-proj-abcdefghijklmnop1234';
const row = {
  id: KEY_ID,
  provider: 'openai' as const,
  lastFour: '1234',
  status: 'pending' as const,
  updatedAt: new Date('2026-11-23T10:00:00Z'),
};

let app: FastifyInstance;
beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app.close();
});
beforeEach(() => {
  vi.clearAllMocks();
  state.writes.clear();
  state.config = { publicKey, version: 3 };
  mockedGetSession.mockResolvedValue(registeredSession() as never);
  repo.save.mockResolvedValue(row);
  repo.list.mockResolvedValue([row]);
});

const put = (provider = 'openai', key = SECRET) =>
  app.inject({ method: 'PUT', url: `/api/own-keys/${provider}`, payload: { key } });

describe('PUT /api/own-keys/:provider', () => {
  it('stores only ciphertext that the worker private key decrypts, with its version and last four', async () => {
    const res = await put();

    expect(res.statusCode).toBe(200);
    const stored = repo.save.mock.calls[0]!;
    expect(stored[0]).toBe(REGISTERED_USER_ID);
    expect(stored[1]).toBe('openai');
    expect(stored[2]).toMatchObject({ keyVersion: 3, lastFour: '1234' });
    expect(JSON.stringify(stored)).not.toContain(SECRET);
    const plain = privateDecrypt(
      { key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
      Buffer.from(stored[2].ciphertext, 'base64'),
    );
    expect(plain.toString('utf8')).toBe(SECRET);
  });

  it('answers provider, last four and status, never the key', async () => {
    const res = await put();

    expect(res.json()).toEqual({
      provider: 'openai',
      lastFour: '1234',
      status: 'pending',
      updatedAt: '2026-11-23T10:00:00.000Z',
    });
    expect(res.body).not.toContain(SECRET);
  });

  it('enqueues the validation job for the stored key', async () => {
    await put();

    expect(enqueueOwnKeyValidation).toHaveBeenCalledWith({ ownKeyId: KEY_ID }, expect.anything());
  });

  it('refuses a Guest and an unverified user, storing nothing', async () => {
    mockedGetSession.mockResolvedValue(guestSession() as never);
    expect((await put()).statusCode).toBe(403);
    mockedGetSession.mockResolvedValue(unverifiedSession() as never);
    expect((await put()).statusCode).toBe(403);

    expect(repo.save).not.toHaveBeenCalled();
    expect(enqueueOwnKeyValidation).not.toHaveBeenCalled();
  });

  it('answers 404 while Own keys are switched off', async () => {
    state.config = null;

    expect((await put()).statusCode).toBe(404);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('rejects an unknown provider and a too-short key', async () => {
    expect((await put('google')).statusCode).toBe(400);
    expect((await put('openai', 'short')).statusCode).toBe(400);
  });

  it('rate-limits saves per User', async () => {
    for (let i = 0; i < 10; i++) expect((await put()).statusCode).toBe(200);

    const res = await put();

    expect(res.statusCode).toBe(429);
    expect(res.json()).toMatchObject({ error: 'TooManyRequests' });
  });
});

describe('GET /api/own-keys', () => {
  it('lists provider, last four and status without any key material', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/own-keys' });

    expect(res.json()).toEqual({
      enabled: true,
      keys: [
        {
          provider: 'openai',
          lastFour: '1234',
          status: 'pending',
          updatedAt: '2026-11-23T10:00:00.000Z',
        },
      ],
    });
  });

  it('refuses a Guest', async () => {
    mockedGetSession.mockResolvedValue(guestSession() as never);

    expect((await app.inject({ method: 'GET', url: '/api/own-keys' })).statusCode).toBe(403);
  });
});

describe('DELETE /api/own-keys/:provider', () => {
  it('removes the caller’s key and answers 204', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/own-keys/anthropic' });

    expect(res.statusCode).toBe(204);
    expect(repo.remove).toHaveBeenCalledWith(REGISTERED_USER_ID, 'anthropic');
  });

  it('still removes while Own keys are switched off', async () => {
    state.config = null;

    expect((await app.inject({ method: 'DELETE', url: '/api/own-keys/openai' })).statusCode).toBe(
      204,
    );
  });

  it('refuses an unverified user', async () => {
    mockedGetSession.mockResolvedValue(unverifiedSession() as never);

    expect((await app.inject({ method: 'DELETE', url: '/api/own-keys/openai' })).statusCode).toBe(
      403,
    );
  });
});
