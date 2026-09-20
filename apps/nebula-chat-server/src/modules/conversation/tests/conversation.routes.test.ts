import { fromPartial } from '@total-typescript/shoehorn';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '@backend/test/app';
import { REGISTERED_USER_ID, registeredSession } from '@backend/test/session';

// ADR-0008: only the repository layer is faked. Routing, Zod validation, the
// error handler and the hook chain are all the real thing.
vi.mock('@backend/modules/conversation/conversation.repository', () => ({
  conversationRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    search: vi.fn(),
  },
}));

// No database in a unit test; this also keeps the real pg Pool out of the
// process, whose end() throws on a second app close.
vi.mock('@backend/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));

// The create route is gated by `requireUser`; faking `@backend/auth` lets the
// test authenticate without a real better-auth instance (ADR-0008).
vi.mock('@backend/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));

import { auth } from '@backend/auth';
import { conversationRepository } from '@backend/modules/conversation/conversation.repository';

const repo = vi.mocked(conversationRepository);
const mockedGetSession = vi.mocked(auth.api.getSession);

const CONVERSATION_ID = '11111111-1111-4111-8111-111111111111';

// Only the fields the response schema serialises. `fromPartial` is applied at
// each mock call site, where the target row type can be inferred.
const aConversation = (overrides: Record<string, unknown> = {}) => ({
  id: CONVERSATION_ID,
  title: 'A conversation',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
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
  // Default: an authenticated Registered user, so the gated create route passes.
  mockedGetSession.mockResolvedValue(registeredSession() as never);
});

describe('POST /api/conversations', () => {
  it('creates a conversation owned by the session user and responds 201', async () => {
    repo.create.mockResolvedValue(fromPartial(aConversation()));

    const res = await app.inject({
      method: 'POST',
      url: '/api/conversations',
      payload: { title: 'A conversation' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ id: CONVERSATION_ID, title: 'A conversation' });
    // The owner is taken from the session, never the request body.
    expect(repo.create).toHaveBeenCalledWith({ title: 'A conversation' }, REGISTERED_USER_ID);
  });

  it('rejects an unauthenticated create with 401 and never reaches the repository', async () => {
    mockedGetSession.mockResolvedValue(null);

    const res = await app.inject({
      method: 'POST',
      url: '/api/conversations',
      payload: { title: 'A conversation' },
    });

    expect(res.statusCode).toBe(401);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('serialises createdAt as an ISO string', async () => {
    repo.create.mockResolvedValue(fromPartial(aConversation()));

    const res = await app.inject({
      method: 'POST',
      url: '/api/conversations',
      payload: { title: 'A conversation' },
    });

    expect(res.json().createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('rejects a missing title with 400 and never reaches the repository', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/conversations', payload: {} });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ success: false, error: 'ValidationError' });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects an empty title with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/conversations',
      payload: { title: '' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('surfaces a repository failure as a 500 in the standard error shape', async () => {
    repo.create.mockRejectedValue(new Error('database unavailable'));

    const res = await app.inject({
      method: 'POST',
      url: '/api/conversations',
      payload: { title: 'A conversation' },
    });

    expect(res.statusCode).toBe(500);
    expect(res.json()).toMatchObject({ success: false });
  });

  it('maps a Postgres unique-violation onto 409 without leaking the driver message', async () => {
    repo.create.mockRejectedValue(Object.assign(new Error('duplicate key'), { code: '23505' }));

    const res = await app.inject({
      method: 'POST',
      url: '/api/conversations',
      payload: { title: 'A conversation' },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().message).not.toContain('duplicate key');
  });
});

describe('GET /api/conversations/:conversationId', () => {
  it('returns the conversation when it exists', async () => {
    repo.findById.mockResolvedValue(fromPartial(aConversation()));

    const res = await app.inject({ method: 'GET', url: `/api/conversations/${CONVERSATION_ID}` });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: CONVERSATION_ID });
    // Owner-scoped: the lookup is filtered to the session user.
    expect(repo.findById).toHaveBeenCalledWith(
      { conversationId: CONVERSATION_ID },
      REGISTERED_USER_ID,
    );
  });

  it('returns 404 with a NotFound code when the conversation is absent or not owned', async () => {
    repo.findById.mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: `/api/conversations/${CONVERSATION_ID}` });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ success: false, error: 'NotFound' });
  });

  it('rejects a non-UUID id with 400 before touching the repository', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/conversations/not-a-uuid' });

    expect(res.statusCode).toBe(400);
    expect(repo.findById).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated read with 401 and never reaches the repository', async () => {
    mockedGetSession.mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: `/api/conversations/${CONVERSATION_ID}` });

    expect(res.statusCode).toBe(401);
    expect(repo.findById).not.toHaveBeenCalled();
  });
});

describe('GET /api/conversations', () => {
  const page = { conversations: [aConversation()], nextCursor: null, hasMore: false };

  it('returns a page of conversations', async () => {
    repo.findAll.mockResolvedValue(fromPartial(page));

    const res = await app.inject({ method: 'GET', url: '/api/conversations' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ hasMore: false, nextCursor: null });
  });

  it('applies the default limit when none is supplied', async () => {
    repo.findAll.mockResolvedValue(fromPartial(page));

    await app.inject({ method: 'GET', url: '/api/conversations' });

    // Owner-scoped: the session user is the first argument.
    expect(repo.findAll).toHaveBeenCalledWith(REGISTERED_USER_ID, 10, undefined);
  });

  it('coerces the limit query parameter to a number', async () => {
    repo.findAll.mockResolvedValue(fromPartial(page));

    await app.inject({ method: 'GET', url: '/api/conversations?limit=25' });

    expect(repo.findAll).toHaveBeenCalledWith(REGISTERED_USER_ID, 25, undefined);
  });

  it('passes the pagination cursor through', async () => {
    repo.findAll.mockResolvedValue(fromPartial(page));

    await app.inject({ method: 'GET', url: `/api/conversations?cursor=${CONVERSATION_ID}` });

    expect(repo.findAll).toHaveBeenCalledWith(REGISTERED_USER_ID, 10, CONVERSATION_ID);
  });

  it('rejects an unauthenticated list with 401 and never reaches the repository', async () => {
    mockedGetSession.mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: '/api/conversations' });

    expect(res.statusCode).toBe(401);
    expect(repo.findAll).not.toHaveBeenCalled();
  });

  it('rejects a limit above the configured maximum', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/conversations?limit=101' });

    expect(res.statusCode).toBe(400);
    expect(repo.findAll).not.toHaveBeenCalled();
  });

  it('rejects a limit below 1', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/conversations?limit=0' });

    expect(res.statusCode).toBe(400);
  });

  it('rejects a malformed cursor', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/conversations?cursor=nope' });

    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/conversations/search', () => {
  it('returns matching conversations', async () => {
    repo.search.mockResolvedValue(fromPartial([aConversation()]));

    const res = await app.inject({ method: 'GET', url: '/api/conversations/search?q=hello' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
    // Owner-scoped: the session user is the first argument.
    expect(repo.search).toHaveBeenCalledWith(REGISTERED_USER_ID, 'hello');
  });

  it('rejects a missing query string with 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/conversations/search' });

    expect(res.statusCode).toBe(400);
    expect(repo.search).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated search with 401 and never reaches the repository', async () => {
    mockedGetSession.mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: '/api/conversations/search?q=hello' });

    expect(res.statusCode).toBe(401);
    expect(repo.search).not.toHaveBeenCalled();
  });

  it('rejects an empty query string with 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/conversations/search?q=' });

    expect(res.statusCode).toBe(400);
  });

  it('is matched ahead of the /:conversationId route', async () => {
    repo.search.mockResolvedValue(fromPartial([]));

    await app.inject({ method: 'GET', url: '/api/conversations/search?q=x' });

    // A route-ordering regression would send this to findById instead.
    expect(repo.search).toHaveBeenCalled();
    expect(repo.findById).not.toHaveBeenCalled();
  });
});

describe('health and root routes', () => {
  it('reports liveness on /health', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ok');
  });

  it('serves a welcome message at the root', async () => {
    const res = await app.inject({ method: 'GET', url: '/' });

    expect(res.statusCode).toBe(200);
    expect(res.json().message).toContain('Nebula Chat');
  });

  it('serves the generated OpenAPI document', async () => {
    const res = await app.inject({ method: 'GET', url: '/openapi.json' });

    expect(res.statusCode).toBe(200);
    expect(res.json().openapi).toBe('3.0.0');
  });

  it('responds 404 for an unknown route', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nope' });

    expect(res.statusCode).toBe(404);
  });
});
