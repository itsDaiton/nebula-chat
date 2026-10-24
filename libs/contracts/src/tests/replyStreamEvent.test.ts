import { describe, expect, it } from 'vitest';
import {
  parseReplyStreamEvent,
  serializeReplyStreamEvent,
  type ReplyStreamEvent,
} from '../replyStreamEvent';

const events: ReplyStreamEvent[] = [
  { type: 'token', token: 'Hel' },
  { type: 'usage', promptTokens: 5, completionTokens: 2, totalTokens: 7 },
  {
    type: 'error',
    success: false,
    error: 'Internal',
    message: 'An internal server error occurred',
  },
  { type: 'end' },
  { type: 'end', reason: 'cancelled' },
];

describe('reply stream events', () => {
  it.each(events)('round-trips a $type event through a stream entry', (event) => {
    expect(parseReplyStreamEvent(serializeReplyStreamEvent(event))).toEqual(event);
  });

  it('refuses to serialize an event that breaks the contract', () => {
    expect(() =>
      serializeReplyStreamEvent({ type: 'usage', promptTokens: -1 } as unknown as ReplyStreamEvent),
    ).toThrow();
  });

  it('reads an entry that is not JSON as no event', () => {
    expect(parseReplyStreamEvent('not json')).toBeNull();
  });

  it('reads an unknown event type as no event', () => {
    expect(parseReplyStreamEvent(JSON.stringify({ type: 'step-started' }))).toBeNull();
  });

  it('reads an end event with a reason outside the known set as no event', () => {
    expect(parseReplyStreamEvent(JSON.stringify({ type: 'end', reason: 'exploded' }))).toBeNull();
  });

  it('reads an error event without a valid envelope as no event', () => {
    expect(parseReplyStreamEvent(JSON.stringify({ type: 'error', error: 'Oops' }))).toBeNull();
  });
});
