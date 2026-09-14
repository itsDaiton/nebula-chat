import { fromPartial } from '@total-typescript/shoehorn';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '@backend/test/app';

vi.mock('@backend/modules/message/message.repository', () => ({
  messageRepository: { create: vi.fn(), findById: vi.fn(), findAll: vi.fn() },
}));
vi.mock('@backend/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));

import { messageRepository } from '@backend/modules/message/message.repository';

const repo = vi.mocked(messageRepository);

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
});

describe('GET /api/messages/:messageId', () => {
  it('returns the message when it exists', async () => {
    repo.findById.mockResolvedValue(fromPartial(aMessage()));

    const res = await app.inject({ method: 'GET', url: `/api/messages/${MESSAGE_ID}` });

    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(MESSAGE_ID);
    expect(repo.findById).toHaveBeenCalledWith({ messageId: MESSAGE_ID });
  });

  it('returns 404 when the message is absent', async () => {
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
});
