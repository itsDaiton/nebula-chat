import { describe, it, expect, vi, beforeEach } from 'vitest';
import type * as RedisLib from '@nebula-chat/redis';

// `vi.mock` is hoisted above the module body, so the factory's dependencies must
// be hoisted too (a plain `const` would be in its TDZ when the factory runs).
const { mockCache, mockClose } = vi.hoisted(() => ({
  mockCache: { get: vi.fn(), set: vi.fn(async () => undefined), del: vi.fn(), clear: vi.fn() },
  mockClose: vi.fn(async () => undefined),
}));

// Keep the real key helpers (hashText/buildKey) but stub the connection factory
// so importing @backend/redis does not construct a live ioredis client.
vi.mock('@nebula-chat/redis', async (importActual) => {
  const actual = await importActual<typeof RedisLib>();
  return {
    ...actual,
    createRedis: vi.fn(() => ({ cache: mockCache, connection: {}, close: mockClose })),
  };
});

import { hashText } from '@nebula-chat/redis';
import { chatCacheKey, getCachedStream, saveCachedStream, closeRedis } from '@backend/redis';
import type { CreateChatStreamDTO } from '@backend/modules/chat/chat.types';

const base: CreateChatStreamDTO = {
  model: 'gpt-4o-mini',
  conversationId: '11111111-1111-4111-8111-111111111111',
  messages: [{ role: 'user', content: 'what is 2+2?' }],
  regenerate: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('chatCacheKey', () => {
  it('keys on conversation, model and a hash of the last user message', () => {
    expect(chatCacheKey(base)).toBe(
      `conversation:${base.conversationId}:model:gpt-4o-mini:prompt:${hashText('what is 2+2?')}`,
    );
  });

  it('falls back to "default" when there is no conversationId', () => {
    const withoutConversation: CreateChatStreamDTO = {
      model: base.model,
      messages: base.messages,
      regenerate: false,
    };

    expect(chatCacheKey(withoutConversation)).toContain('conversation:default:');
  });

  it('hashes the last user message when several are present', () => {
    const withHistory: CreateChatStreamDTO = {
      ...base,
      messages: [
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'reply' },
        { role: 'user', content: 'second' },
      ],
    };

    expect(chatCacheKey(withHistory)).toContain(`prompt:${hashText('second')}`);
  });

  it('hashes an empty prompt when the request carries no user message', () => {
    const assistantOnly: CreateChatStreamDTO = {
      ...base,
      messages: [{ role: 'assistant', content: 'hello' }],
    };

    expect(chatCacheKey(assistantOnly)).toContain(`prompt:${hashText('')}`);
  });
});

describe('getCachedStream', () => {
  it('delegates the lookup to the redis cache under the given key', async () => {
    mockCache.get.mockResolvedValue({ tokens: 'x' });

    const result = await getCachedStream('k');

    expect(mockCache.get).toHaveBeenCalledWith('k');
    expect(result).toEqual({ tokens: 'x' });
  });
});

describe('saveCachedStream', () => {
  it('stores tokens and usage under the key', async () => {
    await saveCachedStream('k', 'event: token\ndata: {}', {
      promptTokens: 1,
      completionTokens: 2,
      totalTokens: 3,
    });

    expect(mockCache.set).toHaveBeenCalledWith('k', {
      tokens: 'event: token\ndata: {}',
      usageData: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
    });
  });

  it('omits usageData when none is given', async () => {
    await saveCachedStream('k', 'tokens');

    expect(mockCache.set).toHaveBeenCalledWith('k', { tokens: 'tokens' });
  });
});

describe('closeRedis', () => {
  it('closes the toolkit', async () => {
    await closeRedis();

    expect(mockClose).toHaveBeenCalled();
  });
});
