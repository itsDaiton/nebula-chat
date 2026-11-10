import { describe, expect, it } from 'vitest';
import type { ReplyState } from '@/modules/chat/types/types';
import { IDLE_REPLY, isReplyInFlight } from '@/modules/chat/utils/replyState';

describe('isReplyInFlight', () => {
  it.each<ReplyState>([
    { status: 'sending', stopRequested: false },
    { status: 'sending', stopRequested: true },
    { status: 'streaming' },
    { status: 'navigating', then: { status: 'stopped' } },
  ])('holds the composer while the reply is $status', (reply) => {
    expect(isReplyInFlight(reply)).toBe(true);
  });

  it.each<ReplyState>([IDLE_REPLY, { status: 'stopped' }, { status: 'failed', error: 'Boom' }])(
    'frees the composer once the reply rests $status',
    (reply) => {
      expect(isReplyInFlight(reply)).toBe(false);
    },
  );
});
