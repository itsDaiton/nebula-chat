import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@server/auth';
import { env } from '@server/env';
import {
  adminSession,
  adminWithout2FASession,
  guestSession,
  registeredSession,
} from '@server/test/session';

vi.mock('@server/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));
vi.mock('@server/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));

import authGate from '@server/plugins/authGate.plugin';

const mockedGetSession = vi.mocked(auth.api.getSession);

const ok = () => ({ ok: true });

afterEach(() => {
  vi.clearAllMocks();
});

describe('Access level boot check', () => {
  it('refuses a route with no level, naming the method and URL', async () => {
    const app = Fastify();
    await app.register(authGate);
    app.register(async (child) => {
      child.get('/forgotten', ok);
    });

    await expect(app.ready()).rejects.toThrow(/GET \/forgotten must declare an Access level/);
  });

  it('refuses a route in an encapsulated child scope', async () => {
    const app = Fastify();
    await app.register(authGate);
    app.register(async (child) => {
      child.register(async (grandchild) => {
        grandchild.post('/nested', ok);
      });
    });

    await expect(app.ready()).rejects.toThrow(/POST \/nested/);
  });

  it('refuses an unknown level', async () => {
    const app = Fastify();
    await app.register(authGate);
    app.register(async (child) => {
      // @ts-expect-error an unknown level is a compile error in a route file too
      child.get('/odd', { config: { access: 'superuser' } }, ok);
    });

    await expect(app.ready()).rejects.toThrow(/GET \/odd.*superuser/);
  });

  it('treats the docs routes as public', async () => {
    const app = Fastify();
    await app.register(authGate);
    await app.register(async (child) => {
      child.get('/docs/static/index.css', ok);
    });
    await app.ready();

    expect((await app.inject('/docs/static/index.css')).statusCode).toBe(200);
  });
});

describe('Access level gates', () => {
  const app = Fastify();
  const bodyRoute = (access: 'user' | 'registered' | 'admin') =>
    app.post(
      `/${access}`,
      {
        config: { access },
        schema: {
          body: { type: 'object', required: ['x'], properties: { x: { type: 'string' } } },
        },
      },
      ok,
    );

  const ready = (async () => {
    await app.register(authGate);
    bodyRoute('user');
    bodyRoute('registered');
    bodyRoute('admin');
    app.get('/public', { config: { access: 'public' } }, ok);
    app.get('/operator', { config: { access: 'operator' } }, ok);
    await app.ready();
  })();

  const status = async (url: string, session: unknown, init: object = {}) => {
    await ready;
    mockedGetSession.mockResolvedValue(session as never);
    return (await app.inject({ url, method: 'POST', payload: {}, ...init })).statusCode;
  };

  it('answers public to anyone', async () => {
    await ready;
    mockedGetSession.mockResolvedValue(null);

    expect((await app.inject('/public')).statusCode).toBe(200);
  });

  it.each([
    ['user', null, 401],
    ['user', guestSession(), 200],
    ['registered', null, 401],
    ['registered', guestSession(), 403],
    ['registered', registeredSession(), 200],
    ['admin', registeredSession(), 403],
    ['admin', adminWithout2FASession(), 403],
    ['admin', adminSession(), 200],
  ])('%s answers a session %#: %i', async (level, session, expected) => {
    expect(await status(`/${level}`, session, { payload: { x: 'valid' } })).toBe(expected);
  });

  it.each(['user', 'registered', 'admin'])(
    'turns an anonymous caller with an invalid body away with 401 on %s, not 400',
    async (level) => {
      expect(await status(`/${level}`, null)).toBe(401);
    },
  );

  it('still validates the body once the gate has passed', async () => {
    expect(await status('/user', guestSession())).toBe(400);
  });

  it('operator admits only the operator token, and a missing one is a 404', async () => {
    await ready;
    const token = env.OPERATOR_TOKEN;
    const get = async (authorization?: string) =>
      (await app.inject({ url: '/operator', headers: authorization ? { authorization } : {} }))
        .statusCode;

    expect(await get(`Bearer ${token}`)).toBe(200);
    expect(await get('Bearer wrong-token')).toBe(403);
    expect(await get()).toBe(403);
    env.OPERATOR_TOKEN = undefined;
    expect(await get(`Bearer ${token}`)).toBe(404);
    env.OPERATOR_TOKEN = token;
  });

  it('runs the gate once on the HEAD route Fastify derives from a GET', async () => {
    await ready;
    mockedGetSession.mockClear();
    mockedGetSession.mockResolvedValue(guestSession() as never);
    const head = Fastify();
    await head.register(authGate);
    head.get('/h', { config: { access: 'user' } }, ok);
    await head.ready();

    await head.inject({ url: '/h', method: 'HEAD' });

    expect(mockedGetSession).toHaveBeenCalledTimes(1);
  });
});
