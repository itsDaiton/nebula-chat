import { fromPartial } from '@total-typescript/shoehorn';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '@server/test/app';
import { REGISTERED_USER_ID, registeredSession } from '@server/test/session';

// ADR-0008: only the repository layer is faked. Routing, Zod validation, the
// error handler and the hook chain are all the real thing.
vi.mock('@server/modules/session/session.repository', () => ({
  sessionRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    search: vi.fn(),
    archive: vi.fn(),
    restore: vi.fn(),
  },
}));

// No database in a unit test; this also keeps the real pg Pool out of the
// process, whose end() throws on a second app close.
vi.mock('@server/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));

// The create route is gated by `requireAuthentication`; faking `@server/auth` lets the
// test authenticate without a real better-auth instance (ADR-0008).
vi.mock('@server/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));

// @server/redis is the boundary to Redis: each Session's in-flight reply stream lives in memory.
vi.mock('@server/redis', async () => {
  const { replyStreamsModule } = await import('@server/test/memoryReplyStreams.js');
  return {
    redis: { connection: {}, close: vi.fn(async () => undefined) },
    closeRedis: vi.fn(async () => undefined),
    ...replyStreamsModule,
  };
});

import { auth } from '@server/auth';
import { replyStreams } from '@server/test/memoryReplyStreams';
import { sessionRepository } from '@server/modules/session/session.repository';

const repo = vi.mocked(sessionRepository);
const mockedGetSession = vi.mocked(auth.api.getSession);

const SESSION_ID = '11111111-1111-4111-8111-111111111111';

// Only the fields the response schema serialises. `fromPartial` is applied at
// each mock call site, where the target row type can be inferred.
const aSession = (overrides: Record<string, unknown> = {}) => ({
  id: SESSION_ID,
  title: 'A session',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  archived: false,
  ...overrides,
});

let app: FastifyInstance;

// Built once per file: app construction is the expensive part, and nothing in
// these tests mutates the instance.
beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
  replyStreams.reset();
  // Default: an authenticated Registered user, so the gated create route passes.
  mockedGetSession.mockResolvedValue(registeredSession() as never);
});

describe('POST /api/sessions', () => {
  it("creates a session owned by the auth session's user and responds 201", async () => {
    repo.create.mockResolvedValue(fromPartial(aSession()));

    const res = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: { title: 'A session' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ id: SESSION_ID, title: 'A session' });
    // The owner is taken from the session, never the request body.
    expect(repo.create).toHaveBeenCalledWith({ title: 'A session' }, REGISTERED_USER_ID);
  });

  it('rejects an unauthenticated create with 401 and never reaches the repository', async () => {
    mockedGetSession.mockResolvedValue(null);

    const res = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: { title: 'A session' },
    });

    expect(res.statusCode).toBe(401);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('serialises createdAt as an ISO string', async () => {
    repo.create.mockResolvedValue(fromPartial(aSession()));

    const res = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: { title: 'A session' },
    });

    expect(res.json().createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('strips a field the response schema does not declare', async () => {
    repo.create.mockResolvedValue(fromPartial(aSession({ userId: REGISTERED_USER_ID })));

    const res = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: { title: 'A session' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({
      id: SESSION_ID,
      title: 'A session',
      createdAt: '2026-01-01T00:00:00.000Z',
      archived: false,
    });
  });

  it('answers 500 Internal when the reply does not match its response schema', async () => {
    repo.create.mockResolvedValue(fromPartial(aSession({ createdAt: 'not a date' })));

    const res = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: { title: 'A session' },
    });

    expect(res.statusCode).toBe(500);
    expect(res.json()).toMatchObject({ success: false, error: 'Internal' });
  });

  it('rejects a missing title with 400 and never reaches the repository', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/sessions', payload: {} });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ success: false, error: 'Validation' });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects an empty title with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: { title: '' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('surfaces a repository failure as a 500 in the standard error shape', async () => {
    repo.create.mockRejectedValue(new Error('database unavailable'));

    const res = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: { title: 'A session' },
    });

    expect(res.statusCode).toBe(500);
    expect(res.json()).toMatchObject({ success: false });
  });

  it('maps a Postgres unique-violation onto 409 without leaking the driver message', async () => {
    repo.create.mockRejectedValue(Object.assign(new Error('duplicate key'), { code: '23505' }));

    const res = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: { title: 'A session' },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().message).not.toContain('duplicate key');
  });
});

describe('GET /api/sessions/:sessionId', () => {
  it('returns the session when it exists', async () => {
    repo.findById.mockResolvedValue(fromPartial(aSession()));

    const res = await app.inject({ method: 'GET', url: `/api/sessions/${SESSION_ID}` });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: SESSION_ID });
    // Owner-scoped: the lookup is filtered to the auth session's user.
    expect(repo.findById).toHaveBeenCalledWith({ sessionId: SESSION_ID }, REGISTERED_USER_ID);
  });

  it('returns an archived Session by id, marked archived', async () => {
    repo.findById.mockResolvedValue(fromPartial(aSession({ archived: true })));

    const res = await app.inject({ method: 'GET', url: `/api/sessions/${SESSION_ID}` });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: SESSION_ID, archived: true });
  });

  it('names the reply still streaming, so a page reloaded mid-reply can re-attach to it', async () => {
    const STREAM_ID = '33333333-3333-4333-8333-333333333333';
    repo.findById.mockResolvedValue(fromPartial(aSession()));
    replyStreams.activeStreams.set(SESSION_ID, STREAM_ID);

    const res = await app.inject({ method: 'GET', url: `/api/sessions/${SESSION_ID}` });

    expect(res.json()).toMatchObject({ id: SESSION_ID, activeStreamId: STREAM_ID });
  });

  it('names no reply once the latest one has ended, or when none was ever sent', async () => {
    const STREAM_ID = '33333333-3333-4333-8333-333333333333';
    repo.findById.mockResolvedValue(fromPartial(aSession()));

    const none = await app.inject({ method: 'GET', url: `/api/sessions/${SESSION_ID}` });
    replyStreams.activeStreams.set(SESSION_ID, STREAM_ID);
    replyStreams.ended.add(STREAM_ID);
    const ended = await app.inject({ method: 'GET', url: `/api/sessions/${SESSION_ID}` });

    expect(none.json()).toMatchObject({ activeStreamId: null });
    expect(ended.json()).toMatchObject({ activeStreamId: null });
  });

  it('returns 404 with a NotFound code when the session is absent or not owned', async () => {
    repo.findById.mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: `/api/sessions/${SESSION_ID}` });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ success: false, error: 'NotFound' });
  });

  it('rejects a non-UUID id with 400 before touching the repository', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/sessions/not-a-uuid' });

    expect(res.statusCode).toBe(400);
    expect(repo.findById).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated read with 401 and never reaches the repository', async () => {
    mockedGetSession.mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: `/api/sessions/${SESSION_ID}` });

    expect(res.statusCode).toBe(401);
    expect(repo.findById).not.toHaveBeenCalled();
  });
});

describe('GET /api/sessions', () => {
  const page = { sessions: [aSession()], nextCursor: null, hasMore: false };

  it('returns a page of sessions', async () => {
    repo.findAll.mockResolvedValue(fromPartial(page));

    const res = await app.inject({ method: 'GET', url: '/api/sessions' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ hasMore: false, nextCursor: null });
  });

  it('applies the default limit when none is supplied', async () => {
    repo.findAll.mockResolvedValue(fromPartial(page));

    await app.inject({ method: 'GET', url: '/api/sessions' });

    // Owner-scoped: the auth session's user is the first argument.
    expect(repo.findAll).toHaveBeenCalledWith(REGISTERED_USER_ID, 10, undefined, false);
  });

  it('coerces the limit query parameter to a number', async () => {
    repo.findAll.mockResolvedValue(fromPartial(page));

    await app.inject({ method: 'GET', url: '/api/sessions?limit=25' });

    expect(repo.findAll).toHaveBeenCalledWith(REGISTERED_USER_ID, 25, undefined, false);
  });

  it('passes the pagination cursor through', async () => {
    repo.findAll.mockResolvedValue(fromPartial(page));

    await app.inject({ method: 'GET', url: `/api/sessions?cursor=${SESSION_ID}` });

    expect(repo.findAll).toHaveBeenCalledWith(REGISTERED_USER_ID, 10, SESSION_ID, false);
  });

  it('lists only archived Sessions when asked with ?archived=true', async () => {
    repo.findAll.mockResolvedValue(fromPartial(page));

    await app.inject({ method: 'GET', url: '/api/sessions?archived=true' });

    expect(repo.findAll).toHaveBeenCalledWith(REGISTERED_USER_ID, 10, undefined, true);
  });

  it('rejects a non-boolean archived flag', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/sessions?archived=maybe' });

    expect(res.statusCode).toBe(400);
    expect(repo.findAll).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated list with 401 and never reaches the repository', async () => {
    mockedGetSession.mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: '/api/sessions' });

    expect(res.statusCode).toBe(401);
    expect(repo.findAll).not.toHaveBeenCalled();
  });

  it('rejects a limit above the configured maximum', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/sessions?limit=101' });

    expect(res.statusCode).toBe(400);
    expect(repo.findAll).not.toHaveBeenCalled();
  });

  it('rejects a limit below 1', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/sessions?limit=0' });

    expect(res.statusCode).toBe(400);
  });

  it('rejects a malformed cursor', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/sessions?cursor=nope' });

    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/sessions/search', () => {
  it('returns matching sessions', async () => {
    repo.search.mockResolvedValue(fromPartial([aSession()]));

    const res = await app.inject({ method: 'GET', url: '/api/sessions/search?q=hello' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
    // Owner-scoped: the auth session's user is the first argument.
    expect(repo.search).toHaveBeenCalledWith(REGISTERED_USER_ID, 'hello', false);
  });

  it('searches archived Sessions only when asked with archived=true', async () => {
    repo.search.mockResolvedValue(fromPartial([aSession({ archived: true })]));

    const res = await app.inject({
      method: 'GET',
      url: '/api/sessions/search?q=hello&archived=true',
    });

    expect(res.statusCode).toBe(200);
    expect(repo.search).toHaveBeenCalledWith(REGISTERED_USER_ID, 'hello', true);
  });

  it('rejects a missing query string with 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/sessions/search' });

    expect(res.statusCode).toBe(400);
    expect(repo.search).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated search with 401 and never reaches the repository', async () => {
    mockedGetSession.mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: '/api/sessions/search?q=hello' });

    expect(res.statusCode).toBe(401);
    expect(repo.search).not.toHaveBeenCalled();
  });

  it('rejects an empty query string with 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/sessions/search?q=' });

    expect(res.statusCode).toBe(400);
  });

  it('is matched ahead of the /:sessionId route', async () => {
    repo.search.mockResolvedValue(fromPartial([]));

    await app.inject({ method: 'GET', url: '/api/sessions/search?q=x' });

    // A route-ordering regression would send this to findById instead.
    expect(repo.search).toHaveBeenCalled();
    expect(repo.findById).not.toHaveBeenCalled();
  });
});

describe.each([
  ['archive', 'archived', true],
  ['restore', 'restored', false],
] as const)('POST /api/sessions/:sessionId/%s', (action, _past, archived) => {
  const url = `/api/sessions/${SESSION_ID}/${action}`;
  const method = repo[action];

  it(`${action}s the caller's own Session and returns it`, async () => {
    method.mockResolvedValue(fromPartial(aSession({ archived })));

    const res = await app.inject({ method: 'POST', url });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: SESSION_ID, archived });
    // Owner-scoped: the auth session's user is part of the lookup.
    expect(method).toHaveBeenCalledWith(SESSION_ID, REGISTERED_USER_ID);
  });

  it('is idempotent: repeating it answers 200 again', async () => {
    method.mockResolvedValue(fromPartial(aSession({ archived })));

    const first = await app.inject({ method: 'POST', url });
    const second = await app.inject({ method: 'POST', url });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
  });

  it("answers a typed 404 for a Session the caller doesn't own or that doesn't exist", async () => {
    method.mockResolvedValue(null);

    const res = await app.inject({ method: 'POST', url });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ success: false, error: 'NotFound' });
  });

  it('rejects a non-UUID id with 400 before touching the repository', async () => {
    const res = await app.inject({ method: 'POST', url: `/api/sessions/not-a-uuid/${action}` });

    expect(res.statusCode).toBe(400);
    expect(method).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated call with 401 and never reaches the repository', async () => {
    mockedGetSession.mockResolvedValue(null);

    const res = await app.inject({ method: 'POST', url });

    expect(res.statusCode).toBe(401);
    expect(method).not.toHaveBeenCalled();
  });
});
