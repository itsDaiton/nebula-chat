import { describe, expect, it } from 'vitest';
import { mapSessionMessages } from '@/modules/chat/utils/mapSessionMessages';

const aMessage = (id: string, role: string, content: string) => ({
  id,
  role,
  content,
  sessionId: 'c1',
  tokenCount: 3,
  cached: false,
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('mapSessionMessages', () => {
  it('keeps only the fields the chat view renders', () => {
    expect(mapSessionMessages([aMessage('m1', 'user', 'hello')])).toEqual([
      { id: 'm1', role: 'user', content: 'hello' },
    ]);
  });

  it('preserves order', () => {
    const mapped = mapSessionMessages([
      aMessage('a', 'user', 'first'),
      aMessage('b', 'assistant', 'second'),
    ]);

    expect(mapped.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('drops a message whose role the chat view cannot render', () => {
    const mapped = mapSessionMessages([
      aMessage('a', 'user', 'kept'),
      aMessage('b', 'tool', 'dropped'),
    ]);

    expect(mapped.map((m) => m.id)).toEqual(['a']);
  });

  it('maps an empty session to an empty list', () => {
    expect(mapSessionMessages([])).toEqual([]);
  });
});
