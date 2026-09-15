import { describe, expect, it } from 'vitest';
import { mapConversationMessages } from '@/modules/chat/utils/mapConversationMessages';

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
