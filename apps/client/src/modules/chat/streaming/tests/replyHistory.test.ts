import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '@/modules/chat/types/types';
import {
  failReply,
  startRun,
  withEmptyReply,
  withReply,
} from '@/modules/chat/streaming/replyHistory';

const user: ChatMessage = { id: 'u1', role: 'user', content: 'what is 2+2?' };
const reply: ChatMessage = { id: 'a1', role: 'assistant', content: '2+' };

describe('withReply', () => {
  it('updates only the trailing assistant Message', () => {
    expect(withReply([user, reply], (last) => ({ ...last, content: '4' }))).toEqual([
      user,
      { ...reply, content: '4' },
    ]);
  });

  it('returns the same history without a trailing reply', () => {
    const history = [user];

    expect(withReply(history, (last) => ({ ...last, content: 'x' }))).toBe(history);
  });
});

describe('withEmptyReply', () => {
  it('adds an empty assistant Message to fill as the reply streams', () => {
    const [, added] = withEmptyReply([user]);

    expect(added).toMatchObject({ role: 'assistant', content: '' });
    expect(added?.id).toEqual(expect.any(String));
  });
});

describe('startRun', () => {
  it('gives the reply its Run with no Steps yet', () => {
    expect(startRun([user, reply], 'r1')).toEqual([
      user,
      { ...reply, runId: 'r1', run: { steps: [], status: null } },
    ]);
  });
});

describe('failReply', () => {
  it('replaces the reply text with the error', () => {
    expect(failReply([user, reply], 'Provider down')).toEqual([
      user,
      { ...reply, content: 'Provider down' },
    ]);
  });

  it("marks a Run's reply failed", () => {
    const running = { ...reply, run: { steps: [], status: null } };

    expect(failReply([user, running], 'boom').at(-1)?.run?.status).toBe('failed');
  });

  it('leaves a chat without a trailing reply alone', () => {
    expect(failReply([user], 'boom')).toEqual([user]);
  });
});
