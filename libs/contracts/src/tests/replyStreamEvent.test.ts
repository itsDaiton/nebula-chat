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
  {
    type: 'step-started',
    stepId: '11111111-1111-4111-8111-111111111111',
    attempt: 1,
    phase: 'intake',
    agent: 'language',
    label: 'Detecting the language',
  },
  { type: 'step-finished', stepId: '11111111-1111-4111-8111-111111111111', status: 'failed' },
  { type: 'run-finished', runId: '22222222-2222-4222-8222-222222222222', status: 'partial' },
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
    expect(parseReplyStreamEvent(JSON.stringify({ type: 'tool-called' }))).toBeNull();
  });

  it('reads an end event with a reason outside the known set as no event', () => {
    expect(parseReplyStreamEvent(JSON.stringify({ type: 'end', reason: 'exploded' }))).toBeNull();
  });

  it('reads a step-started event without an attempt as no event', () => {
    const event = {
      type: 'step-started',
      stepId: '11111111-1111-4111-8111-111111111111',
      phase: 'output',
      agent: 'output',
      label: 'Writing the answer',
    };
    expect(parseReplyStreamEvent(JSON.stringify(event))).toBeNull();
  });

  it('reads a run-finished event with a status that is not an end state as no event', () => {
    const event = {
      type: 'run-finished',
      runId: '22222222-2222-4222-8222-222222222222',
      status: 'running',
    };
    expect(parseReplyStreamEvent(JSON.stringify(event))).toBeNull();
  });

  it('reads an error event without a valid envelope as no event', () => {
    expect(parseReplyStreamEvent(JSON.stringify({ type: 'error', error: 'Oops' }))).toBeNull();
  });
});
