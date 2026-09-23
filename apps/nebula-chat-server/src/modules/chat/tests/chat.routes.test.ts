import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { sseToken, sseUsage } from '@nebula-chat/langchain';
import { createTestApp } from '@backend/test/app';
import { guestSession, registeredSession, REGISTERED_USER_ID } from '@backend/test/session';

vi.mock('@backend/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));

// @backend/auth is the boundary to better-auth: the route's `requireAuthentication` gate
// calls `auth.api.getSession`, so faking the module lets the test drive the
// session (a Registered user by default; a Guest in the allowance tests) without
// standing up a real better-auth instance (ADR-0008).
vi.mock('@backend/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));

// message.repository is the boundary the message-allowance hook reaches Postgres
// through (the live `role='user'` count). The rest of the chat send path fakes
// the chat service, so this is the only DB seam the route test opens.
vi.mock('@backend/modules/message/message.repository', () => ({
  messageRepository: { countUserMessagesByOwner: vi.fn() },
}));

// @backend/redis is the boundary to Redis: the hooks call its cache helpers, so
// faking the module keeps this route test about routing, hijacking and the cache
// hooks without opening a connection.
vi.mock('@backend/redis', () => ({
  redis: { cache: {}, connection: {}, close: vi.fn(async () => undefined) },
  closeRedis: vi.fn(async () => undefined),
  chatCacheKey: vi.fn(() => 'cache-key'),
  getCachedStream: vi.fn(),
  saveCachedStream: vi.fn(async () => undefined),
}));

// The whole chat service is faked: the controller and both hooks import from it,
// and this keeps the route test about routing, hijacking and the cache hooks.
vi.mock('@backend/modules/chat/chat.service', () => ({
  chatService: { streamResponse: vi.fn() },
  validateChatRequest: vi.fn(async () => undefined),
  createUserMessage: vi.fn(async () => ({
    conversationId: '11111111-1111-4111-8111-111111111111',
    userMessageId: '22222222-2222-4222-8222-222222222222',
    isNewConversation: false,
  })),
}));

vi.mock('@backend/modules/message/message.service', () => ({
  messageService: {
    createMessage: vi.fn(async () => ({ id: '33333333-3333-4333-8333-333333333333' })),
  },
}));

import { auth } from '@backend/auth';
import { getCachedStream, saveCachedStream } from '@backend/redis';
import { chatService, createUserMessage } from '@backend/modules/chat/chat.service';
import { messageRepository } from '@backend/modules/message/message.repository';
import { messageService } from '@backend/modules/message/message.service';

const mockedGetCachedStream = vi.mocked(getCachedStream);
const mockedSaveCachedStream = vi.mocked(saveCachedStream);
const chat = vi.mocked(chatService);
const mockedCreateUserMessage = vi.mocked(createUserMessage);
const mockedGetSession = vi.mocked(auth.api.getSession);
const mockedCountUserMessages = vi.mocked(messageRepository.countUserMessagesByOwner);

const validBody = {
  model: 'gpt-4o-mini',
  conversationId: '11111111-1111-4111-8111-111111111111',
  messages: [{ role: 'user', content: 'what is 2+2?' }],
};

// The route is rate-limited to 10 requests per minute per IP, and
// @fastify/rate-limit keeps that state for the life of the app. Each request
// therefore comes from its own address so one test cannot exhaust another's
// budget; the limit itself is exercised deliberately below.
let nextIp = 0;
const uniqueIp = () => `10.1.${Math.floor(nextIp / 256) % 256}.${nextIp++ % 256}`;

// Awaited here so the inject() chain type resolves to a response rather than
// light-my-request's chainable builder.
const post = async (
  payload: object,
  app: FastifyInstance,
  remoteAddress = uniqueIp(),
): Promise<LightMyRequestResponse> =>
  app.inject({ method: 'POST', url: '/api/chat/stream', payload, remoteAddress });

const eventsIn = (body: string) =>
  body
    .split('\n')
    .filter((l) => l.startsWith('event: '))
    .map((l) => l.slice(7));

let app: FastifyInstance;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  // raw.end() emits 'finish' asynchronously, so the previous request's capture
  // hook can still be in flight. Let it land before clearing, or its
  // saveCachedStream call is attributed to this test.
  await new Promise((resolve) => setImmediate(resolve));
  vi.clearAllMocks();
  // Default: an authenticated Registered user (uncapped). Allowance tests below
  // swap in a Guest and drive the live message count.
  mockedGetSession.mockResolvedValue(registeredSession() as never);
  mockedCountUserMessages.mockResolvedValue(0);
  mockedGetCachedStream.mockResolvedValue(null);
  mockedSaveCachedStream.mockResolvedValue(undefined);
  mockedCreateUserMessage.mockResolvedValue({
    conversationId: '11111111-1111-4111-8111-111111111111',
    userMessageId: '22222222-2222-4222-8222-222222222222',
    isNewConversation: false,
  });
  chat.streamResponse.mockImplementation(async (_data, write) => {
    write(sseToken('4'));
    write(sseUsage({ promptTokens: 5, completionTokens: 1, totalTokens: 6 }));
    return {
      conversationId: '11111111-1111-4111-8111-111111111111',
      userMessageId: '22222222-2222-4222-8222-222222222222',
      assistantMessageId: '33333333-3333-4333-8333-333333333333',
    };
  });
});

describe('POST /api/chat/stream — validation', () => {
  it('rejects an unregistered model before any work happens', async () => {
    const res = await post({ ...validBody, model: 'gpt-9000' }, app);

    expect(res.statusCode).toBe(400);
    expect(chat.streamResponse).not.toHaveBeenCalled();
  });

  it('rejects a request carrying more than one message', async () => {
    const res = await post(
      { ...validBody, messages: [...validBody.messages, { role: 'user', content: 'and again' }] },
      app,
    );

    expect(res.statusCode).toBe(400);
  });

  it('rejects an empty messages array', async () => {
    const res = await post({ ...validBody, messages: [] }, app);

    expect(res.statusCode).toBe(400);
  });

  it('rejects empty message content', async () => {
    const res = await post({ ...validBody, messages: [{ role: 'user', content: '' }] }, app);

    expect(res.statusCode).toBe(400);
  });

  it('rejects a non-UUID conversationId', async () => {
    const res = await post({ ...validBody, conversationId: 'nope' }, app);

    expect(res.statusCode).toBe(400);
  });

  it('accepts a request with no conversationId, starting a new conversation', async () => {
    const withoutConversation = { model: validBody.model, messages: validBody.messages };

    const res = await post(withoutConversation, app);
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.statusCode).toBe(200);
  });
});

describe('POST /api/chat/stream — cache miss', () => {
  it('streams the model response as SSE and terminates with an end event', async () => {
    const res = await post(validBody, app);
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/event-stream');
    expect(eventsIn(res.body)).toEqual(['token', 'usage', 'end']);
  });

  it('consults the cache before calling the model', async () => {
    await post(validBody, app);
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockedGetCachedStream).toHaveBeenCalledWith('cache-key');
    expect(chat.streamResponse).toHaveBeenCalled();
  });

  it('captures the completed stream into the cache', async () => {
    await post(validBody, app);
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockedSaveCachedStream).toHaveBeenCalledWith(
      'cache-key',
      expect.stringContaining('event: token'),
      expect.objectContaining({ totalTokens: 6 }),
    );
  });

  it('strips usage and end events from what it caches, so a replay is not double-counted', async () => {
    await post(validBody, app);
    await new Promise((resolve) => setImmediate(resolve));

    const cached = mockedSaveCachedStream.mock.calls[0]![1];
    expect(cached).not.toContain('event: usage');
    expect(cached).not.toContain('event: end');
  });

  it('falls open to normal streaming when the cache lookup throws', async () => {
    mockedGetCachedStream.mockRejectedValue(new Error('redis down'));

    const res = await post(validBody, app);
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.statusCode).toBe(200);
    expect(chat.streamResponse).toHaveBeenCalled();
  });

  // KNOWN BUG, pinned rather than endorsed: streamCaptureHook guards on
  // `full.trim() === ''` *before* filtering, and the controller always writes an
  // `end` frame — so a stream that produced no tokens still looks non-empty and
  // gets cached as whitespace. Every identical request then replays an empty
  // answer for the whole TTL instead of retrying the model. The same is true of
  // a stream that only produced an `event: error`.
  it('caches a whitespace entry when the model produced nothing', async () => {
    chat.streamResponse.mockImplementation(async () => undefined);

    await post(validBody, app);
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockedSaveCachedStream).toHaveBeenCalled();
    const lastCall = mockedSaveCachedStream.mock.calls.at(-1)!;
    expect(lastCall[1].trim()).toBe('');
  });
});

describe('POST /api/chat/stream — cache hit', () => {
  const cachedEntry = {
    tokens: `${sseToken('4')}`,
    usageData: { promptTokens: 5, completionTokens: 1, totalTokens: 6 },
  };

  it('replays the cached stream without calling the model', async () => {
    mockedGetCachedStream.mockResolvedValue(cachedEntry);

    const res = await post(validBody, app);

    expect(res.statusCode).toBe(200);
    expect(chat.streamResponse).not.toHaveBeenCalled();
  });

  it('marks the response as a cache hit', async () => {
    mockedGetCachedStream.mockResolvedValue(cachedEntry);

    const res = await post(validBody, app);

    expect(eventsIn(res.body)).toEqual([
      'user-message-created',
      'cache-hit',
      'token',
      'usage',
      'assistant-message-created',
      'end',
    ]);
  });

  it('announces a new conversation when the replay creates one', async () => {
    mockedGetCachedStream.mockResolvedValue(cachedEntry);
    mockedCreateUserMessage.mockResolvedValue({
      conversationId: '11111111-1111-4111-8111-111111111111',
      userMessageId: '22222222-2222-4222-8222-222222222222',
      isNewConversation: true,
    });

    const res = await post(validBody, app);

    expect(eventsIn(res.body)[0]).toBe('conversation-created');
  });

  it('replays zeroed usage when the cached entry carries none', async () => {
    mockedGetCachedStream.mockResolvedValue({ tokens: sseToken('4') });

    const res = await post(validBody, app);

    expect(res.body).toContain('"totalTokens":0');
  });

  it('persists the reconstructed assistant message from the cached tokens', async () => {
    mockedGetCachedStream.mockResolvedValue(cachedEntry);

    await post(validBody, app);

    expect(vi.mocked(messageService).createMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'assistant', content: '4' }),
      REGISTERED_USER_ID,
    );
  });

  it('does not re-cache a replayed stream', async () => {
    mockedGetCachedStream.mockResolvedValue(cachedEntry);

    await post(validBody, app);
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockedSaveCachedStream).not.toHaveBeenCalled();
  });
});

describe('POST /api/chat/stream — regenerate', () => {
  const cachedEntry = {
    tokens: `${sseToken('4')}`,
    usageData: { promptTokens: 5, completionTokens: 1, totalTokens: 6 },
  };

  it('bypasses the cache and calls the model even when an entry exists', async () => {
    mockedGetCachedStream.mockResolvedValue(cachedEntry);

    const res = await post({ ...validBody, regenerate: true }, app);
    // Drain the fire-and-forget capture so its saveCachedStream is not
    // attributed to a later test.
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.statusCode).toBe(200);
    expect(mockedGetCachedStream).not.toHaveBeenCalled();
    expect(chat.streamResponse).toHaveBeenCalled();
  });

  it('overwrites the cached entry with the fresh completion', async () => {
    mockedGetCachedStream.mockResolvedValue(cachedEntry);

    await post({ ...validBody, regenerate: true }, app);
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockedSaveCachedStream).toHaveBeenCalledWith(
      'cache-key',
      expect.stringContaining('event: token'),
      expect.objectContaining({ totalTokens: 6 }),
    );
  });
});

describe('POST /api/chat/stream — Guest message allowance', () => {
  // GUEST_MESSAGE_ALLOWANCE defaults to 10 (env.ts). The count comes live from
  // Postgres via the mocked repository.
  const CAP = 10;

  it('lets a Guest under the cap send', async () => {
    mockedGetSession.mockResolvedValue(guestSession() as never);
    mockedCountUserMessages.mockResolvedValue(CAP - 1);

    const res = await post(validBody, app);
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.statusCode).toBe(200);
    expect(chat.streamResponse).toHaveBeenCalled();
  });

  it('rejects a Guest at the cap with a 403 Forbidden', async () => {
    mockedGetSession.mockResolvedValue(guestSession() as never);
    mockedCountUserMessages.mockResolvedValue(CAP);

    const res = await post(validBody, app);

    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({
      success: false,
      error: 'Forbidden',
      message: 'Guest message allowance reached. Register or sign in to continue.',
      details: { limit: CAP, count: CAP },
    });
    // Rejected before any model work.
    expect(chat.streamResponse).not.toHaveBeenCalled();
  });

  it('still allows a regenerate at the cap, since regenerations do not count', async () => {
    mockedGetSession.mockResolvedValue(guestSession() as never);
    mockedCountUserMessages.mockResolvedValue(CAP + 5);

    const res = await post({ ...validBody, regenerate: true }, app);
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.statusCode).toBe(200);
    // The count is never consulted for a regenerate.
    expect(mockedCountUserMessages).not.toHaveBeenCalled();
    expect(chat.streamResponse).toHaveBeenCalled();
  });

  it('leaves a Registered user uncapped, never counting their messages', async () => {
    mockedGetSession.mockResolvedValue(registeredSession() as never);
    mockedCountUserMessages.mockResolvedValue(CAP + 100);

    const res = await post(validBody, app);
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.statusCode).toBe(200);
    expect(mockedCountUserMessages).not.toHaveBeenCalled();
    expect(chat.streamResponse).toHaveBeenCalled();
  });

  it('rejects a request with no authenticated session', async () => {
    mockedGetSession.mockResolvedValue(null);

    const res = await post(validBody, app);

    expect(res.statusCode).toBe(401);
    expect(chat.streamResponse).not.toHaveBeenCalled();
  });
});

describe('POST /api/chat/stream — rate limiting', () => {
  it('rejects the eleventh request from one address within the window', async () => {
    const ip = '10.99.0.1';
    const statuses: number[] = [];

    for (let i = 0; i < 11; i++) {
      statuses.push((await post(validBody, app, ip)).statusCode);
    }

    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it('answers a rate-limited request with the TooManyRequests envelope', async () => {
    const ip = '10.99.0.4';
    let res: LightMyRequestResponse | undefined;
    for (let i = 0; i < 11; i++) res = await post(validBody, app, ip);

    expect(res?.json()).toMatchObject({ success: false, error: 'TooManyRequests' });
  });

  it('does not spend another address’s budget', async () => {
    const ip = '10.99.0.2';
    for (let i = 0; i < 11; i++) await post(validBody, app, ip);

    const res = await post(validBody, app, '10.99.0.3');

    expect(res.statusCode).toBe(200);
  });
});
