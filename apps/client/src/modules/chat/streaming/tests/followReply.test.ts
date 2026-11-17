import { beforeEach, describe, expect, it } from 'vitest';
import type { SetStateAction } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { HttpResponse, http } from 'msw';
import type { Message } from '@/libs/api/generated/model/message';
import { getListMessagesQueryKey } from '@/libs/api/generated/messages/messages';
import { getListMessagesMockHandler } from '@/libs/api/generated/messages/messages.msw';
import { getGetRunQueryKey } from '@/libs/api/generated/runs/runs';
import type { ChatMessage, ChatStreamState, ReplySink } from '@/modules/chat/types/types';
import { followReply } from '@/modules/chat/streaming/followReply';
import { API_ROUTE } from '@/test/api';
import { mockReplyStream, sseFrame } from '@/test/chat';
import { server } from '@/test/msw';
import { createTestQueryClient } from '@/test/render';

const SESSION_ID = 's1';
const user: ChatMessage = { id: 'u1', role: 'user', content: 'what is 2+2?' };
const reply: ChatMessage = { id: 'a1', role: 'assistant', content: '' };

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
  createdAt: '2026-11-17T00:00:00.000Z',
  ...patch,
});

/** A sink over plain values, recording every history write. */
const sinkOf = (initial: ChatMessage[], isCurrent = true) => {
  const state = { history: initial, usage: null as ChatStreamState['usage'], writes: 0 };
  const sink: ReplySink = {
    getHistory: () => state.history,
    setHistory: (next: SetStateAction<ChatMessage[]>) => {
      state.writes += 1;
      state.history = typeof next === 'function' ? next(state.history) : next;
    },
    setUsage: (usage) => {
      state.usage = usage;
    },
    isCurrent: () => isCurrent,
  };
  return { state, sink };
};

let queryClient: QueryClient;

const follow = (sink: ReplySink, signal = new AbortController().signal) =>
  followReply(queryClient, {
    streamId: 'st1',
    sessionId: SESSION_ID,
    signal,
    reconnectDelaysMs: [0],
    sink,
  });

beforeEach(() => {
  queryClient = createTestQueryClient();
  server.use(
    getListMessagesMockHandler([
      saved('m1', 'user', 'what is 2+2?'),
      saved('m2', 'assistant', '4', { model: 'gpt-4.1', estimatedCostUsd: 0.002 }),
    ]),
  );
});

describe('followReply', () => {
  it('streams the reply into the chat, with its usage and saved meta', async () => {
    server.use(
      mockReplyStream(
        sseFrame('token', { token: '4' }, '1-0'),
        sseFrame('usage', { promptTokens: 10, completionTokens: 2, totalTokens: 12 }, '1-1'),
        sseFrame('end', {}, '1-2'),
      ),
    );
    const { state, sink } = sinkOf([user, reply]);

    await expect(follow(sink)).resolves.toEqual({ status: 'idle' });

    expect(state.usage).toEqual({ promptTokens: 10, completionTokens: 2, totalTokens: 12 });
    await expect
      .poll(() => state.history.at(-1))
      .toMatchObject({
        content: '4',
        tokenCount: 12,
        model: 'gpt-4.1',
        estimatedCostUsd: 0.002,
      });
  });

  it('refreshes the saved Messages once the reply completes', async () => {
    server.use(mockReplyStream(sseFrame('end', {}, '1-0')));
    queryClient.setQueryData(getListMessagesQueryKey({ sessionId: SESSION_ID }), []);

    await follow(sinkOf([user, reply]).sink);

    expect(
      queryClient.getQueryState(getListMessagesQueryKey({ sessionId: SESSION_ID }))?.isInvalidated,
    ).toBe(true);
  });

  it('leaves the meta row alone once another Session is on screen', async () => {
    server.use(
      mockReplyStream(sseFrame('token', { token: '4' }, '1-0'), sseFrame('end', {}, '1-1')),
    );
    const { state, sink } = sinkOf([user, reply], false);

    await follow(sink);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(state.history.at(-1)).toEqual({ ...reply, content: '4' });
  });

  it('refreshes nothing after a failed reply', async () => {
    server.use(
      mockReplyStream(
        sseFrame('error', { success: false, error: 'Internal', message: 'Down' }, '1-0'),
      ),
    );
    queryClient.setQueryData(getListMessagesQueryKey({ sessionId: SESSION_ID }), []);
    const { state, sink } = sinkOf([user, reply]);

    await expect(follow(sink)).resolves.toEqual({ status: 'failed', error: 'Down' });

    expect(state.history.at(-1)?.content).toBe('Down');
    expect(
      queryClient.getQueryState(getListMessagesQueryKey({ sessionId: SESSION_ID }))?.isInvalidated,
    ).toBe(false);
  });

  it("refreshes the Run a Run event moved on, so the Inspector's view follows", async () => {
    server.use(
      mockReplyStream(
        sseFrame('run-finished', { runId: 'r1', status: 'completed' }, '1-0'),
        sseFrame('end', {}, '1-1'),
      ),
    );
    queryClient.setQueryData(getGetRunQueryKey('r1'), { finishedAt: '2026-11-17T00:00:00.000Z' });

    await follow(sinkOf([user, { ...reply, run: { steps: [], status: null } }]).sink);

    expect(queryClient.getQueryState(getGetRunQueryKey('r1'))?.isInvalidated).toBe(true);
  });

  it('writes nothing for a frame that changes nothing', async () => {
    server.use(mockReplyStream(sseFrame('token', {}, '1-0'), sseFrame('end', {}, '1-1')));
    const { state, sink } = sinkOf([user, reply], false);

    await follow(sink);

    expect(state.writes).toBe(0);
  });

  it('shows the saved Messages for an expired stream', async () => {
    server.use(http.get(API_ROUTE.replyStream, () => new HttpResponse(null, { status: 404 })));
    const { state, sink } = sinkOf([user, reply]);

    await expect(follow(sink)).resolves.toEqual({ status: 'idle' });

    expect(state.history.map(({ id }) => id)).toEqual(['m1', 'm2']);
  });
});
