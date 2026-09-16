import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { sseToken, sseUsage } from '@nebula-chat/langchain';
import { createTestApp } from '@backend/test/app';

vi.mock('@backend/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));

vi.mock('@backend/cache/cache.service', () => ({
  cacheService: {
    generateKey: vi.fn(() => 'cache-key'),
    getFromCache: vi.fn(),
    saveToCache: vi.fn(async () => undefined),
  },
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

import { cacheService } from '@backend/cache/cache.service';
import { chatService, createUserMessage } from '@backend/modules/chat/chat.service';
import { messageService } from '@backend/modules/message/message.service';

const cache = vi.mocked(cacheService);
const chat = vi.mocked(chatService);
const mockedCreateUserMessage = vi.mocked(createUserMessage);

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
  // saveToCache call is attributed to this test.
  await new Promise((resolve) => setImmediate(resolve));
  vi.clearAllMocks();
  cache.generateKey.mockReturnValue('cache-key');
  cache.getFromCache.mockResolvedValue(null);
  cache.saveToCache.mockResolvedValue(undefined);
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

    expect(res.statusCode).toBe(200);
  });
});

describe('POST /api/chat/stream — cache miss', () => {
  it('streams the model response as SSE and terminates with an end event', async () => {
    const res = await post(validBody, app);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/event-stream');
    expect(eventsIn(res.body)).toEqual(['token', 'usage', 'end']);
  });

  it('consults the cache before calling the model', async () => {
    await post(validBody, app);

    expect(cache.getFromCache).toHaveBeenCalledWith('cache-key');
    expect(chat.streamResponse).toHaveBeenCalled();
  });

  it('captures the completed stream into the cache', async () => {
    await post(validBody, app);
    await new Promise((resolve) => setImmediate(resolve));

    expect(cache.saveToCache).toHaveBeenCalledWith(
      'cache-key',
      expect.stringContaining('event: token'),
      expect.objectContaining({ totalTokens: 6 }),
    );
  });

  it('strips usage and end events from what it caches, so a replay is not double-counted', async () => {
    await post(validBody, app);
    await new Promise((resolve) => setImmediate(resolve));

    const cached = cache.saveToCache.mock.calls[0]![1];
    expect(cached).not.toContain('event: usage');
    expect(cached).not.toContain('event: end');
  });

  it('falls open to normal streaming when the cache lookup throws', async () => {
    cache.getFromCache.mockRejectedValue(new Error('redis down'));

    const res = await post(validBody, app);

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

    expect(cache.saveToCache).toHaveBeenCalled();
    const lastCall = cache.saveToCache.mock.calls.at(-1)!;
    expect(lastCall[1].trim()).toBe('');
  });
});

describe('POST /api/chat/stream — cache hit', () => {
  const cachedEntry = {
    tokens: `${sseToken('4')}`,
    usageData: { promptTokens: 5, completionTokens: 1, totalTokens: 6 },
  };

  it('replays the cached stream without calling the model', async () => {
    cache.getFromCache.mockResolvedValue(cachedEntry);

    const res = await post(validBody, app);

    expect(res.statusCode).toBe(200);
    expect(chat.streamResponse).not.toHaveBeenCalled();
  });

  it('marks the response as a cache hit', async () => {
    cache.getFromCache.mockResolvedValue(cachedEntry);

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
    cache.getFromCache.mockResolvedValue(cachedEntry);
    mockedCreateUserMessage.mockResolvedValue({
      conversationId: '11111111-1111-4111-8111-111111111111',
      userMessageId: '22222222-2222-4222-8222-222222222222',
      isNewConversation: true,
    });

    const res = await post(validBody, app);

    expect(eventsIn(res.body)[0]).toBe('conversation-created');
  });

  it('replays zeroed usage when the cached entry carries none', async () => {
    cache.getFromCache.mockResolvedValue({ tokens: sseToken('4') });

    const res = await post(validBody, app);

    expect(res.body).toContain('"totalTokens":0');
  });

  it('persists the reconstructed assistant message from the cached tokens', async () => {
    cache.getFromCache.mockResolvedValue(cachedEntry);

    await post(validBody, app);

    expect(vi.mocked(messageService).createMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'assistant', content: '4' }),
    );
  });

  it('does not re-cache a replayed stream', async () => {
    cache.getFromCache.mockResolvedValue(cachedEntry);

    await post(validBody, app);
    await new Promise((resolve) => setImmediate(resolve));

    expect(cache.saveToCache).not.toHaveBeenCalled();
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

  it('does not spend another address\u2019s budget', async () => {
    const ip = '10.99.0.2';
    for (let i = 0; i < 11; i++) await post(validBody, app, ip);

    const res = await post(validBody, app, '10.99.0.3');

    expect(res.statusCode).toBe(200);
  });
});
