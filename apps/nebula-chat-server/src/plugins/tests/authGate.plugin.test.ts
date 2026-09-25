import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError, UnauthorizedError } from '@nebula-chat/errors';
import { createTestApp } from '@backend/test/app';
import { captureLogger } from '@backend/test/logCapture';
import { guestSession, registeredSession, REGISTERED_USER_ID } from '@backend/test/session';

// @backend/auth is the boundary to better-auth. Faking it lets the gates be
// tested against a controllable session without a real instance (ADR-0008). The
// `handler` stub stands in for better-auth's request handler in the catch-all
// delegation test below.
vi.mock('@backend/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));

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
