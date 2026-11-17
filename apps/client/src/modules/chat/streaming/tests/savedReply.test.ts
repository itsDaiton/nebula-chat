import { describe, expect, it } from 'vitest';
import type { SetStateAction } from 'react';
import type { Message } from '@/libs/api/generated/model/message';
import { getListMessagesMockHandler } from '@/libs/api/generated/messages/messages.msw';
import type { ChatMessage } from '@/modules/chat/types/types';
import { showSavedReply, showSavedReplyMeta } from '@/modules/chat/streaming/savedReply';
import { server } from '@/test/msw';
import { createTestQueryClient } from '@/test/render';

const SESSION_ID = 's1';

const saved = (
  id: string,
  role: string,
  content: string,
  patch: Partial<Message> = {},
): Message => ({
  id,
  role,
  content,
  sessionId: SESSION_ID,
  tokenCount: null,
  cached: false,
  model: null,
  estimatedCostUsd: null,
  runId: null,
  contextTokens: null,
  contextMessages: null,
  createdAt: '2026-11-16T00:00:00.000Z',
  ...patch,
});

const user: ChatMessage = { id: 'u1', role: 'user', content: 'what is 2+2?' };
const streamed: ChatMessage = { id: 'a1', role: 'assistant', content: '4', tokenCount: 12 };

/** A history setter over a plain array, for asserting what the helper wrote. */
const historyOf = (initial: ChatMessage[]) => {
  const state = { history: initial };
  const setHistory = (next: SetStateAction<ChatMessage[]>) => {
    state.history = typeof next === 'function' ? next(state.history) : next;
  };
  return { state, setHistory };
};

describe('showSavedReply', () => {
  it("replaces the chat with the Session's saved Messages", async () => {
    server.use(
      getListMessagesMockHandler([saved('m1', 'user', 'hi'), saved('m2', 'assistant', 'hello')]),
    );
    const { state, setHistory } = historyOf([user, streamed]);

    await showSavedReply(createTestQueryClient(), SESSION_ID, setHistory);

    expect(state.history.map(({ id, content }) => ({ id, content }))).toEqual([
      { id: 'm1', content: 'hi' },
      { id: 'm2', content: 'hello' },
    ]);
  });
});

describe('showSavedReplyMeta', () => {
  const savedReply = saved('m2', 'assistant', '4', {
    model: 'gpt-4.1',
    estimatedCostUsd: 0.002,
    runId: 'r1',
    tokenCount: null,
  });

  it("puts the saved reply's Model, cost and Run on the streamed one, keeping its token count", async () => {
    server.use(getListMessagesMockHandler([saved('m1', 'user', 'hi'), savedReply]));
    const { state, setHistory } = historyOf([user, streamed]);

    await showSavedReplyMeta(createTestQueryClient(), SESSION_ID, setHistory, () => true);

    expect(state.history).toEqual([
      user,
      { ...streamed, model: 'gpt-4.1', estimatedCostUsd: 0.002, runId: 'r1', tokenCount: 12 },
    ]);
  });

  it('leaves the chat alone once another Session is on screen', async () => {
    server.use(getListMessagesMockHandler([savedReply]));
    const { state, setHistory } = historyOf([user, streamed]);

    await showSavedReplyMeta(createTestQueryClient(), SESSION_ID, setHistory, () => false);

    expect(state.history).toEqual([user, streamed]);
  });
});
