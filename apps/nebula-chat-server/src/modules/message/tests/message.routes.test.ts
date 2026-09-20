import { fromPartial } from '@total-typescript/shoehorn';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '@backend/test/app';
import { REGISTERED_USER_ID, registeredSession } from '@backend/test/session';

// ADR-0008: only the repository layer is faked. The owner-scoped create path also
// consults the conversation repository, so it is faked here too.
vi.mock('@backend/modules/message/message.repository', () => ({
  messageRepository: { create: vi.fn(), findById: vi.fn(), findAll: vi.fn() },
}));
vi.mock('@backend/modules/conversation/conversation.repository', () => ({
  conversationRepository: { findByIdSimple: vi.fn() },
}));
vi.mock('@backend/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));

// Every message route is gated by `requireUser`; faking `@backend/auth` lets the
// test authenticate without a real better-auth instance (ADR-0008).
vi.mock('@backend/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));

import { auth } from '@backend/auth';
import { messageRepository } from '@backend/modules/message/message.repository';
import { conversationRepository } from '@backend/modules/conversation/conversation.repository';

const repo = vi.mocked(messageRepository);
const conversationRepo = vi.mocked(conversationRepository);
const mockedGetSession = vi.mocked(auth.api.getSession);

const MESSAGE_ID = '33333333-3333-4333-8333-333333333333';
const CONVERSATION_ID = '11111111-1111-4111-8111-111111111111';

type MessageRow = {
  id: string;
  conversationId: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  tokenCount: number | null;
  cached: boolean;
  createdAt: Date;
};

const aMessage = (overrides: Partial<MessageRow> = {}): MessageRow => ({
  id: MESSAGE_ID,
  conversationId: CONVERSATION_ID,
  content: 'hello',
  role: 'user',
  tokenCount: 3,
  cached: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const validBody = {
  conversationId: CONVERSATION_ID,
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
  // Default: an authenticated Registered user who owns the target conversation, so
  // the gated routes pass and the create's ownership check succeeds.
  mockedGetSession.mockResolvedValue(registeredSession() as never);
  conversationRepo.findByIdSimple.mockResolvedValue(
    fromPartial({ id: CONVERSATION_ID, userId: REGISTERED_USER_ID }),
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

  it.each(['user', 'assistant', 'system'] as const)('accepts the %s role', async (role) => {
    repo.create.mockResolvedValue(fromPartial(aMessage({ role })));

    const res = await app.inject({
      method: 'POST',
      url: '/api/messages',
      payload: { ...validBody, role },
    });

    expect(res.statusCode).toBe(201);
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

  it('rejects a non-UUID conversationId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/messages',
      payload: { ...validBody, conversationId: 'nope' },
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

  it('returns 404 when the target conversation is not owned by the caller', async () => {
    conversationRepo.findByIdSimple.mockResolvedValue(null);

    const res = await app.inject({ method: 'POST', url: '/api/messages', payload: validBody });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ success: false, error: 'NotFound' });
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
    // Owner-scoped: the lookup is filtered to the session user.
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

    expect(repo.findAll).toHaveBeenCalledWith(REGISTERED_USER_ID);
  });

  it('rejects an unauthenticated list with 401 and never reaches the repository', async () => {
    mockedGetSession.mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: '/api/messages' });

    expect(res.statusCode).toBe(401);
    expect(repo.findAll).not.toHaveBeenCalled();
  });
});
