import type { IncomingMessage, ServerResponse } from 'node:http';
import type * as BetterAuthNode from 'better-auth/node';
import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError, INTERNAL_ERROR_ENVELOPE, UnauthorizedError } from '@nebula-chat/errors';
import { createTestApp } from '@backend/test/app';
import { captureLogger, eventLines, LEVEL } from '@backend/test/logCapture';
import { guestSession, registeredSession, REGISTERED_USER_ID } from '@backend/test/session';

// @backend/auth is the boundary to better-auth: faking it gives the gates a controllable
// session (ADR-0008) and the catch-all tests below a stand-in request `handler`.
vi.mock('@backend/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));

type NodeHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

// Post-header failures need this: better-call's setResponse swallows a failing `auth.handler` body.
const adapterOverride = vi.hoisted(() => ({ current: undefined as NodeHandler | undefined }));
vi.mock('better-auth/node', async (importOriginal) => {
  const actual = await importOriginal<typeof BetterAuthNode>();
  return {
    ...actual,
    toNodeHandler: (...args: Parameters<typeof actual.toNodeHandler>): NodeHandler => {
      const real = actual.toNodeHandler(...args);
      return (req, res) => (adapterOverride.current ?? real)(req, res);
    },
  };
});

// No database in a unit test; also keeps the real pg Pool out of the process.
vi.mock('@backend/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));

import { auth } from '@backend/auth';
import {
  getSessionData,
  requireAuthentication,
  requireRegistered,
} from '@backend/plugins/authGate.plugin';

const mockedGetSession = vi.mocked(auth.api.getSession);

// The gates read `req.headers` and rebind `req.log`/`reply.log`; downstream reads
// happen via `getSessionData`. Both loggers write to one in-memory capture, as
// Fastify's request and reply loggers share one destination.
const makeRequest = () => {
  const { logger, lines } = captureLogger();
  const req = { headers: {}, log: logger } as unknown as FastifyRequest;
  const reply = { log: logger } as unknown as FastifyReply;
  return { req, reply, lines };
};

const makeReq = (): FastifyRequest => makeRequest().req;

// The hooks carry a `this: FastifyInstance` context (Fastify binds it at
// registration); calling them directly needs a plain-function view.
const run = (
  hook: preHandlerAsyncHookHandler,
  req: FastifyRequest,
  reply: FastifyReply = makeRequest().reply,
): Promise<unknown> =>
  (hook as unknown as (r: FastifyRequest, rep: FastifyReply) => Promise<unknown>)(req, reply);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('requireAuthentication', () => {
  it('attaches the resolved session to the request', async () => {
    mockedGetSession.mockResolvedValue(registeredSession() as never);
    const req = makeReq();

    await run(requireAuthentication, req);

    expect(getSessionData(req).user.isAnonymous).toBe(false);
  });

  it('throws UnauthorizedError when there is no session', async () => {
    mockedGetSession.mockResolvedValue(null);

    await expect(run(requireAuthentication, makeReq())).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe('User binding', () => {
  it('binds the Registered user onto both the request and the reply logger', async () => {
    mockedGetSession.mockResolvedValue(registeredSession() as never);
    const { req, reply, lines } = makeRequest();

    await run(requireAuthentication, req, reply);
    req.log.info('from the handler');
    reply.log.info('from the completion hook');

    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(line).toMatchObject({
        'user.id': REGISTERED_USER_ID,
        'nebula.user.kind': 'registered',
      });
    }
  });

  it('binds a Guest as nebula.user.kind guest', async () => {
    mockedGetSession.mockResolvedValue(guestSession() as never);
    const { req, reply, lines } = makeRequest();

    await run(requireAuthentication, req, reply);
    reply.log.info('done');

    expect(lines[0]?.['nebula.user.kind']).toBe('guest');
  });

  it('binds the user even when requireRegistered then rejects a Guest', async () => {
    mockedGetSession.mockResolvedValue(guestSession() as never);
    const { req, reply, lines } = makeRequest();

    await expect(run(requireRegistered, req, reply)).rejects.toBeInstanceOf(ForbiddenError);
    reply.log.info('the 403 completion line');

    expect(lines[0]?.['nebula.user.kind']).toBe('guest');
  });

  it('binds nothing when there is no session', async () => {
    mockedGetSession.mockResolvedValue(null);
    const { req, reply, lines } = makeRequest();

    await expect(run(requireAuthentication, req, reply)).rejects.toBeInstanceOf(UnauthorizedError);
    reply.log.info('the 401 completion line');

    expect(lines[0]).not.toHaveProperty('user.id');
  });
});

describe('requireRegistered', () => {
  it('passes a Registered user through', async () => {
    mockedGetSession.mockResolvedValue(registeredSession() as never);

    await expect(run(requireRegistered, makeReq())).resolves.toBeUndefined();
  });

  it('rejects a Guest with ForbiddenError', async () => {
    mockedGetSession.mockResolvedValue(guestSession() as never);

    await expect(run(requireRegistered, makeReq())).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('rejects an unauthenticated request with UnauthorizedError', async () => {
    mockedGetSession.mockResolvedValue(null);

    await expect(run(requireRegistered, makeReq())).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe('getSessionData', () => {
  it('throws UnauthorizedError when no gate has attached a session', () => {
    expect(() => getSessionData(makeReq())).toThrow(UnauthorizedError);
  });
});

/**
 * Breached-password rejection (ticket Testing item 4).
 *
 * LIMITATION: the actual Have I Been Pwned rejection is better-auth's own
 * behavior (the `haveIBeenPwned` plugin configured in `@nebula-chat/auth`). Truly
 * exercising it means a real better-auth instance signing up against a live
 * Postgres adapter AND an outbound HTTP call to the HIBP range API — both barred
 * by ADR-0008 (no database, no network) and owned by the lib, not this wiring.
 * That end-to-end assertion is therefore covered in `libs/auth`, not here, and is
 * NOT faked into a green server test.
 *
 * What the server layer owns — and what these tests cover — is the mount: the
 * catch-all delegates the raw request/response to better-auth's handler (with
 * Fastify's JSON body parser disabled so the handler reads the raw body) and
 * streams the handler's response back verbatim. A breached-password 400 from
 * better-auth thus reaches the client unchanged; so would any other auth response.
 */
describe('auth catch-all route delegation (GET|POST /api/auth/*)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Stand in for better-auth's handler: echo a HIBP-style rejection for a
    // sign-up carrying a breached password, mirroring what the real plugin emits.
    (auth as { handler: unknown }).handler = async (req: Request): Promise<Response> => {
      const body = (await req.json().catch(() => ({}))) as { password?: string };
      if (body.password === 'password123') {
        return new Response(
          JSON.stringify({ code: 'PASSWORD_COMPROMISED', message: 'Password compromised.' }),
          { status: 400, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('mounts POST /api/auth/* and returns the handler response verbatim (breached password → 400)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: { email: 'a@b.com', password: 'password123', name: 'A' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'PASSWORD_COMPROMISED' });
  });

  it('passes an acceptable sign-up through to the handler (raw body reaches better-auth)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: { email: 'a@b.com', password: 'a-very-unique-passphrase', name: 'A' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true });
  });
});

describe('auth catch-all failure (better-auth throws)', () => {
  const { logger, lines } = captureLogger();
  // ioredis's offline-queue error: what the rate limiter's Redis store throws with Redis down.
  const redisDown = new Error("Stream isn't writeable and enableOfflineQueue options is false");
  let app: FastifyInstance;

  beforeAll(async () => {
    (auth as { handler: unknown }).handler = async (): Promise<Response> => {
      throw redisDown;
    };
    app = await createTestApp({ logger });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    lines.length = 0;
    adapterOverride.current = undefined;
  });

  const signIn = () =>
    app.inject({ method: 'POST', url: '/api/auth/sign-in/anonymous', payload: {} });

  it('answers 500 with the Internal error envelope instead of hanging', async () => {
    const res = await signIn();

    expect(res.statusCode).toBe(500);
    expect(res.headers['content-type']).toBe('application/json; charset=utf-8');
    expect(res.json()).toEqual(INTERNAL_ERROR_ENVELOPE);
  });

  it('logs the failure once, as http.request.failed', async () => {
    await signIn();

    expect(lines.filter((line) => line.level >= LEVEL.error)).toEqual([
      expect.objectContaining({
        level: LEVEL.error,
        'event.name': 'http.request.failed',
        'nebula.component': 'http',
        'error.type': 'Internal',
        'http.request.method': 'POST',
        'url.path': '/api/auth/sign-in/anonymous',
        'http.response.status_code': 500,
        err: expect.objectContaining({ message: redisDown.message }),
      }),
    ]);
  });

  it('names the failure on the request completion line', async () => {
    await signIn();

    expect(eventLines(lines, 'http.request.completed')).toEqual([
      expect.objectContaining({ 'http.response.status_code': 500, 'error.type': 'Internal' }),
    ]);
  });

  it('drops headers the handler set before it threw', async () => {
    adapterOverride.current = async (_req, res) => {
      res.setHeader('set-cookie', 'better-auth.session_token=half-built');
      throw redisDown;
    };

    const res = await signIn();

    expect(res.statusCode).toBe(500);
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(res.json()).toEqual(INTERNAL_ERROR_ENVELOPE);
  });

  it('drops the connection when the handler fails after the headers are sent', async () => {
    adapterOverride.current = async (_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.write('{"partial":');
      throw redisDown;
    };

    await expect(signIn()).rejects.toMatchObject({ code: 'LIGHT_ECONNRESET' });
    expect(eventLines(lines, 'http.request.failed')).toEqual([
      expect.objectContaining({ 'error.type': 'Internal', 'http.response.status_code': 200 }),
    ]);
  });
});
