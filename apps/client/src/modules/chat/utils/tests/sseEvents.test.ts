import { describe, expect, it } from 'vitest';
import { SSE_EVENTS } from '@/modules/chat/utils/sseEvents';

describe('SSE_EVENTS', () => {
  it.each(['token', 'usage', 'error', 'end'])('recognises %s', (name) => {
    expect(SSE_EVENTS.has(name)).toBe(true);
  });

  it('rejects an unknown event name, which is what stops arbitrary frames being acted on', () => {
    expect(SSE_EVENTS.has('cache-hit-typo')).toBe(false);
  });

  it('no longer recognises the retired single-request events', () => {
    expect(SSE_EVENTS.has('session-created')).toBe(false);
  });
});
