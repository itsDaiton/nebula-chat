import { fromPartial } from '@total-typescript/shoehorn';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '@server/test/app';
import { REGISTERED_USER_ID, registeredSession } from '@server/test/session';

// ADR-0008: only the repository layer is faked. The owner-scoped create path also
// consults the session repository, so it is faked here too.
vi.mock('@server/modules/message/message.repository', () => ({
  messageRepository: { create: vi.fn(), findById: vi.fn(), findAll: vi.fn() },
}));
vi.mock('@server/modules/session/session.repository', () => ({
  sessionRepository: { findByIdSimple: vi.fn() },
}));
vi.mock('@server/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));

// Every message route is gated by `requireAuthentication`; faking `@server/auth` lets the
// test authenticate without a real better-auth instance (ADR-0008).
vi.mock('@server/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));

import { auth } from '@server/auth';
import { messageRepository } from '@server/modules/message/message.repository';
import { sessionRepository } from '@server/modules/session/session.repository';

const repo = vi.mocked(messageRepository);
const sessionRepo = vi.mocked(sessionRepository);
const mockedGetSession = vi.mocked(auth.api.getSession);

const MESSAGE_ID = '33333333-3333-4333-8333-333333333333';
const SESSION_ID = '11111111-1111-4111-8111-111111111111';

type MessageRow = {
  id: string;
  sessionId: string;
  content: string;
  role: 'user' | 'assistant';
  tokenCount: number | null;
  cached: boolean;
  model: string | null;
  estimatedCostUsd: number | null;
  runId: string | null;
  contextTokens: number | null;
  contextMessages: number | null;
  createdAt: Date;
};

const aMessage = (overrides: Partial<MessageRow> = {}): MessageRow => ({
  id: MESSAGE_ID,
  sessionId: SESSION_ID,
  content: 'hello',
  role: 'user',
  tokenCount: 3,
  cached: false,
  model: null,
  estimatedCostUsd: null,
  runId: null,
  contextTokens: null,
  contextMessages: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const validBody = {
  sessionId: SESSION_ID,
  role: 'user' as const,
  content: 'hello',
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
  // Default: an authenticated Registered user who owns the target session, so
  // the gated routes pass and the create's ownership check succeeds.
  mockedGetSession.mockResolvedValue(registeredSession() as never);
  sessionRepo.findByIdSimple.mockResolvedValue(
    fromPartial({ id: SESSION_ID, userId: REGISTERED_USER_ID }),
  );
});

describe('POST /api/messages', () => {
  it('creates a message and responds 201', async () => {
    repo.create.mockResolvedValue(fromPartial(aMessage()));

    const res = await app.inject({ method: 'POST', url: '/api/messages', payload: validBody });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ id: MESSAGE_ID, role: 'user' });
  });

  it('accepts an optional tokenCount', async () => {
    repo.create.mockResolvedValue(fromPartial(aMessage({ tokenCount: 42 })));

    const res = await app.inject({
      method: 'POST',
      url: '/api/messages',
      payload: { ...validBody, tokenCount: 42 },
    });

    expect(res.statusCode).toBe(201);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ tokenCount: 42 }));
  });

  it('accepts a null tokenCount', async () => {
    repo.create.mockResolvedValue(fromPartial(aMessage({ tokenCount: null })));

    const res = await app.inject({
      method: 'POST',
      url: '/api/messages',
      payload: { ...validBody, tokenCount: null },
    });

    expect(res.statusCode).toBe(201);
  });

  it.each(['user', 'assistant'] as const)('accepts the %s role', async (role) => {
    repo.create.mockResolvedValue(fromPartial(aMessage({ role })));

    const res = await app.inject({
      method: 'POST',
      url: '/api/messages',
      payload: { ...validBody, role },
    });

    expect(res.statusCode).toBe(201);
  });

  it('rejects the system role', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/messages',
      payload: { ...validBody, role: 'system' },
    });

    expect(res.statusCode).toBe(400);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects a role outside the enum', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/messages',
      payload: { ...validBody, role: 'moderator' },
    });

    expect(res.statusCode).toBe(400);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects a non-UUID sessionId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/messages',
      payload: { ...validBody, sessionId: 'nope' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('rejects empty content', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/messages',
      payload: { ...validBody, content: '' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('rejects a non-integer tokenCount', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/messages',
      payload: { ...validBody, tokenCount: 1.5 },
    });

    expect(res.statusCode).toBe(400);
  });

  it('maps a foreign-key violation onto 409', async () => {
    repo.create.mockRejectedValue(Object.assign(new Error('fk violation'), { code: '23503' }));

    const res = await app.inject({ method: 'POST', url: '/api/messages', payload: validBody });

    expect(res.statusCode).toBe(409);
  });

  it('returns 404 when the target session is not owned by the caller', async () => {
    sessionRepo.findByIdSimple.mockResolvedValue(null);

    const res = await app.inject({ method: 'POST', url: '/api/messages', payload: validBody });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ success: false, error: 'NotFound' });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('answers 409 for an archived Session, creating nothing', async () => {
    sessionRepo.findByIdSimple.mockResolvedValue(
      fromPartial({ id: SESSION_ID, userId: REGISTERED_USER_ID, archivedAt: new Date() }),
    );

    const res = await app.inject({ method: 'POST', url: '/api/messages', payload: validBody });

    expect(res.statusCode).toBe(409);
    expect(res.json().message).toMatch(/restore/i);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated create with 401 and never reaches the repository', async () => {
    mockedGetSession.mockResolvedValue(null);

    const res = await app.inject({ method: 'POST', url: '/api/messages', payload: validBody });

    expect(res.statusCode).toBe(401);
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/messages/:messageId', () => {
  it('returns the message when it exists', async () => {
    repo.findById.mockResolvedValue(fromPartial(aMessage()));

    const res = await app.inject({ method: 'GET', url: `/api/messages/${MESSAGE_ID}` });

    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(MESSAGE_ID);
    // Owner-scoped: the lookup is filtered to the auth session's user.
    expect(repo.findById).toHaveBeenCalledWith({ messageId: MESSAGE_ID }, REGISTERED_USER_ID);
  });

  it('returns 404 when the message is absent or not owned', async () => {
    repo.findById.mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: `/api/messages/${MESSAGE_ID}` });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: 'NotFound' });
  });

  it('rejects a non-UUID id before reaching the repository', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/messages/nope' });

    expect(res.statusCode).toBe(400);
    expect(repo.findById).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated read with 401 and never reaches the repository', async () => {
    mockedGetSession.mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: `/api/messages/${MESSAGE_ID}` });

    expect(res.statusCode).toBe(401);
    expect(repo.findById).not.toHaveBeenCalled();
  });
});

describe('GET /api/messages', () => {
  it('returns every message', async () => {
    repo.findAll.mockResolvedValue(
      fromPartial([aMessage(), aMessage({ id: MESSAGE_ID, role: 'assistant' })]),
    );

    const res = await app.inject({ method: 'GET', url: '/api/messages' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(2);
  });

  describe('the metadata it carries', () => {
    const RUN_ID = '99999999-9999-4999-8999-999999999999';
    const metaOf = (body: Record<string, unknown>) => ({
      model: body.model,
      estimatedCostUsd: body.estimatedCostUsd,
      runId: body.runId,
      contextTokens: body.contextTokens,
      contextMessages: body.contextMessages,
    });
    const NONE = {
      model: null,
      estimatedCostUsd: null,
      runId: null,
      contextTokens: null,
      contextMessages: null,
    };

    it('maps a Direct reply, a Run answer, a user Message and a legacy reply', async () => {
      const direct = {
        model: 'gpt-4o-mini',
        estimatedCostUsd: 0.0012,
        contextTokens: 1200,
        contextMessages: 6,
      };
      const run = { estimatedCostUsd: 0.05, runId: RUN_ID };
      repo.findAll.mockResolvedValue(
        fromPartial([
          aMessage({ role: 'assistant', ...direct }),
          aMessage({ role: 'assistant', ...run }),
          aMessage({ role: 'user' }),
          aMessage({ role: 'assistant' }),
        ]),
      );

      const res = await app.inject({ method: 'GET', url: '/api/messages' });

      expect(res.json().map(metaOf)).toEqual([
        { ...NONE, ...direct },
        { ...NONE, ...run },
        NONE,
        NONE,
      ]);
    });

    it('returns a cached replay at zero cost', async () => {
      repo.findAll.mockResolvedValue(
        fromPartial([
          aMessage({ role: 'assistant', cached: true, model: 'gpt-4o-mini', estimatedCostUsd: 0 }),
        ]),
      );

      const res = await app.inject({ method: 'GET', url: '/api/messages' });

      expect(res.json()[0]).toMatchObject({ cached: true, estimatedCostUsd: 0 });
    });

    it('returns the metadata on a single Message too', async () => {
      repo.findById.mockResolvedValue(
        fromPartial(aMessage({ role: 'assistant', model: 'gpt-4o-mini', contextMessages: 3 })),
      );

      const res = await app.inject({ method: 'GET', url: `/api/messages/${MESSAGE_ID}` });

      expect(res.json()).toMatchObject({ model: 'gpt-4o-mini', contextMessages: 3 });
    });

    it('answers a created Message with null metadata', async () => {
      repo.create.mockResolvedValue(fromPartial(aMessage()));

      const res = await app.inject({ method: 'POST', url: '/api/messages', payload: validBody });

      expect(metaOf(res.json())).toEqual(NONE);
    });
  });

  it('returns an empty array when there are none', async () => {
    repo.findAll.mockResolvedValue(fromPartial([]));

    const res = await app.inject({ method: 'GET', url: '/api/messages' });

    expect(res.json()).toEqual([]);
  });

  it('serialises createdAt as an ISO string', async () => {
    repo.findAll.mockResolvedValue(fromPartial([aMessage()]));

    const res = await app.inject({ method: 'GET', url: '/api/messages' });

    expect(res.json()[0].createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('lists only the caller’s own messages', async () => {
    repo.findAll.mockResolvedValue(fromPartial([aMessage()]));

    await app.inject({ method: 'GET', url: '/api/messages' });

    expect(repo.findAll).toHaveBeenCalledWith(REGISTERED_USER_ID, undefined);
  });

  it('narrows the caller’s messages to one session', async () => {
    repo.findAll.mockResolvedValue(fromPartial([aMessage()]));

    const res = await app.inject({
      method: 'GET',
      url: `/api/messages?sessionId=${SESSION_ID}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
    // Owner-scoped: the filter is applied inside the auth session's user's messages.
    expect(repo.findAll).toHaveBeenCalledWith(REGISTERED_USER_ID, SESSION_ID);
  });

  it('reads a session the caller does not own as empty, not 404', async () => {
    repo.findAll.mockResolvedValue(fromPartial([]));

    const res = await app.inject({
      method: 'GET',
      url: `/api/messages?sessionId=${SESSION_ID}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it('rejects a non-UUID sessionId before reaching the repository', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/messages?sessionId=nope' });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ success: false });
    expect(repo.findAll).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated list with 401 and never reaches the repository', async () => {
    mockedGetSession.mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: '/api/messages' });

    expect(res.statusCode).toBe(401);
    expect(repo.findAll).not.toHaveBeenCalled();
  });
});
