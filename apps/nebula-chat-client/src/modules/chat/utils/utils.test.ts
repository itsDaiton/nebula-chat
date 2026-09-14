import { describe, expect, it } from 'vitest';
import { getMessageBg } from '@/modules/chat/utils/getMessageBg';
import { isUser } from '@/modules/chat/utils/isUser';
import { mapConversationMessages } from '@/modules/chat/utils/mapConversationMessages';
import { modelOptions } from '@/modules/chat/utils/modelOptions';
import { SSE_EVENTS } from '@/modules/chat/utils/sseEvents';

describe('isUser', () => {
  it('recognises the user role', () => {
    expect(isUser('user')).toBe(true);
  });

  it.each(['assistant', 'system', 'User', ''])('rejects %o', (role) => {
    expect(isUser(role)).toBe(false);
  });
});

describe('getMessageBg', () => {
  it('gives user and assistant messages distinct backgrounds in both themes', () => {
    const user = getMessageBg(true);
    const assistant = getMessageBg(false);

    expect(user.base).not.toBe(assistant.base);
    expect(user._dark).not.toBe(assistant._dark);
  });

  it('always supplies a dark-mode token', () => {
    expect(getMessageBg(true)._dark).toBeTruthy();
    expect(getMessageBg(false)._dark).toBeTruthy();
  });
});

describe('mapConversationMessages', () => {
  it('keeps only the fields the chat view renders', () => {
    const mapped = mapConversationMessages([
      {
        id: 'm1',
        role: 'user',
        content: 'hello',
        conversationId: 'c1',
        tokenCount: 3,
        cached: false,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ] as unknown as Parameters<typeof mapConversationMessages>[0]);

    expect(mapped).toEqual([{ id: 'm1', role: 'user', content: 'hello' }]);
  });

  it('preserves order', () => {
    const mapped = mapConversationMessages([
      { id: 'a', role: 'user', content: 'first' },
      { id: 'b', role: 'assistant', content: 'second' },
    ] as unknown as Parameters<typeof mapConversationMessages>[0]);

    expect(mapped.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('maps an empty conversation to an empty list', () => {
    expect(mapConversationMessages([])).toEqual([]);
  });
});

describe('SSE_EVENTS', () => {
  it.each([
    'token',
    'usage',
    'error',
    'end',
    'conversation-created',
    'user-message-created',
    'assistant-message-created',
  ])('recognises %s', (name) => {
    expect(SSE_EVENTS.has(name)).toBe(true);
  });

  it('rejects an unknown event name, which is what stops arbitrary frames being acted on', () => {
    expect(SSE_EVENTS.has('cache-hit-typo')).toBe(false);
  });
});

describe('modelOptions', () => {
  it('offers at least one model', () => {
    expect(modelOptions.items.length).toBeGreaterThan(0);
  });

  it('gives every option a label and a value', () => {
    for (const item of modelOptions.items) {
      expect(item.label).toBeTruthy();
      expect(item.value).toBeTruthy();
    }
  });

  it('has no duplicate values', () => {
    const values = modelOptions.items.map((i) => i.value);

    expect(new Set(values).size).toBe(values.length);
  });

  it('includes the default model the store starts on', () => {
    expect(modelOptions.items.some((i) => i.value === 'gpt-4o-mini')).toBe(true);
  });
});
