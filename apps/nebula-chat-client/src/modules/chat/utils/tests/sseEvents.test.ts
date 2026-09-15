import { describe, expect, it } from 'vitest';
import { SSE_EVENTS } from '@/modules/chat/utils/sseEvents';

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
