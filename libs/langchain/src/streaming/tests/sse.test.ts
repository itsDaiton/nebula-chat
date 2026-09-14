import { describe, expect, it } from 'vitest';
import {
  sseAssistantMessageCreated,
  sseCacheHit,
  sseConversationCreated,
  sseEnd,
  sseError,
  sseToken,
  sseUsage,
  sseUserMessageCreated,
} from '../sse';

/** Parses a raw SSE frame back into its event name and payload. */
const parseFrame = (frame: string) => {
  const match = /^event: (.+)\ndata: (.+)\n\n$/.exec(frame);
  if (!match) throw new Error(`Malformed SSE frame: ${JSON.stringify(frame)}`);
  return { event: match[1], data: JSON.parse(match[2]) as unknown };
};

describe('SSE formatters', () => {
  it('terminates every frame with a blank line so the client flushes it', () => {
    const frames = [
      sseConversationCreated('c1'),
      sseUserMessageCreated('m1'),
      sseAssistantMessageCreated('m2'),
      sseToken('hi'),
      sseUsage({ promptTokens: 1, completionTokens: 2, totalTokens: 3 }),
      sseCacheHit(),
      sseError('boom'),
      sseEnd(),
    ];

    for (const frame of frames) {
      expect(frame.endsWith('\n\n')).toBe(true);
    }
  });

  it('emits conversation-created with the conversation id', () => {
    expect(parseFrame(sseConversationCreated('conv-1'))).toEqual({
      event: 'conversation-created',
      data: { conversationId: 'conv-1' },
    });
  });

  it('emits user-message-created with the message id', () => {
    expect(parseFrame(sseUserMessageCreated('msg-1'))).toEqual({
      event: 'user-message-created',
      data: { messageId: 'msg-1' },
    });
  });

  it('emits assistant-message-created with the message id', () => {
    expect(parseFrame(sseAssistantMessageCreated('msg-2'))).toEqual({
      event: 'assistant-message-created',
      data: { messageId: 'msg-2' },
    });
  });

  it('emits token frames carrying the raw token', () => {
    expect(parseFrame(sseToken('Hello'))).toEqual({
      event: 'token',
      data: { token: 'Hello' },
    });
  });

  it('emits usage frames with all three counts', () => {
    expect(
      parseFrame(sseUsage({ promptTokens: 10, completionTokens: 5, totalTokens: 15 })),
    ).toEqual({ event: 'usage', data: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } });
  });

  it('emits cache-hit and end as bare signals', () => {
    expect(parseFrame(sseCacheHit())).toEqual({ event: 'cache-hit', data: {} });
    expect(parseFrame(sseEnd())).toEqual({ event: 'end', data: {} });
  });

  it('emits errors under an `error` key', () => {
    expect(parseFrame(sseError('it broke'))).toEqual({
      event: 'error',
      data: { error: 'it broke' },
    });
  });

  it('escapes newlines in token content so they cannot split the frame', () => {
    const frame = sseToken('line one\nline two');

    // Exactly one frame terminator — the embedded newline must be JSON-escaped.
    expect(frame.split('\n\n')).toHaveLength(2);
    expect(parseFrame(frame).data).toEqual({ token: 'line one\nline two' });
  });

  it('escapes double quotes in token content', () => {
    expect(parseFrame(sseToken('say "hi"')).data).toEqual({ token: 'say "hi"' });
  });
});
