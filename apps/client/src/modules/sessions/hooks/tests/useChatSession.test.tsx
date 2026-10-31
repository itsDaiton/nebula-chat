import { waitFor } from '@testing-library/react';
import { AppError } from '@nebula-chat/errors';
import { beforeEach, describe, expect, it } from 'vitest';
import { getGetSessionMockHandler } from '@/libs/api/generated/sessions/sessions.msw';
import { getListMessagesQueryKey } from '@/libs/api/generated/messages/messages';
import { getListMessagesMockHandler } from '@/libs/api/generated/messages/messages.msw';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { useChatSession } from '@/modules/sessions/hooks/useChatSession';
import { API_ROUTE, mockApiError } from '@/test/api';
import { server } from '@/test/msw';
import { createTestQueryClient, renderHookWithQueryClient } from '@/test/render';

const SESSION_ID = '11111111-1111-4111-8111-111111111111';

const aMessage = (id: string, sessionId: string, role: string, content: string) => ({
  id,
  sessionId,
  role,
  content,
  tokenCount: null,
  cached: false,
  model: null,
  estimatedCostUsd: null,
  runId: null,
  contextTokens: null,
  contextMessages: null,
  createdAt: '2026-01-01T00:00:00.000Z',
});

// The server narrows the list to the requested session, so the messages
// are only served to a request that names it.
const serveSession = (
  messages = [aMessage('m1', SESSION_ID, 'user', 'a question')],
  activeStreamId: string | null = null,
) =>
  server.use(
    getGetSessionMockHandler({
      id: SESSION_ID,
      title: 'Chat',
      createdAt: '2026-01-01T00:00:00.000Z',
      archived: false,
      activeStreamId,
    }),
    getListMessagesMockHandler(({ request }) =>
      new URL(request.url).searchParams.get('sessionId') === SESSION_ID ? messages : [],
    ),
  );

const chat = () => useChatStreamStore.getState();

beforeEach(() => {
  useChatStreamStore.setState({
    history: [],
    isStreaming: false,
    isPostStreamNavigation: false,
    error: null,
    sessionId: undefined,
  });
});

describe('useChatSession', () => {
  it('loads the session named in the route into the chat history', async () => {
    serveSession([
      aMessage('m1', SESSION_ID, 'user', 'a question'),
      aMessage('m2', SESSION_ID, 'assistant', 'an answer'),
    ]);

    const { result } = renderHookWithQueryClient(() => useChatSession(SESSION_ID));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(chat().history).toEqual([
      {
        id: 'm1',
        role: 'user',
        content: 'a question',
        tokenCount: null,
        model: null,
        estimatedCostUsd: null,
        runId: null,
      },
      {
        id: 'm2',
        role: 'assistant',
        content: 'an answer',
        tokenCount: null,
        model: null,
        estimatedCostUsd: null,
        runId: null,
      },
    ]);
    expect(chat().sessionId).toBe(SESSION_ID);
  });

  it('names the reply still streaming, for the chat to re-attach to', async () => {
    const STREAM_ID = '33333333-3333-4333-8333-333333333333';
    serveSession(undefined, STREAM_ID);

    const { result } = renderHookWithQueryClient(() => useChatSession(SESSION_ID));

    await waitFor(() => expect(result.current.activeStreamId).toBe(STREAM_ID));
  });

  it('names no reply when none is in flight', async () => {
    serveSession();

    const { result } = renderHookWithQueryClient(() => useChatSession(SESSION_ID));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.activeStreamId).toBeNull();
  });

  it('reports loading until the session has arrived', () => {
    serveSession();

    const { result } = renderHookWithQueryClient(() => useChatSession(SESSION_ID));

    expect(result.current.isLoading).toBe(true);
  });

  it('surfaces a session the caller cannot see as a typed AppError', async () => {
    server.use(
      mockApiError('get', API_ROUTE.session, 404, {
        success: false,
        error: 'NotFound',
        message: 'Session not found',
      }),
      getListMessagesMockHandler([]),
    );

    const { result } = renderHookWithQueryClient(() => useChatSession(SESSION_ID));

    await waitFor(() => expect(result.current.error).toBeInstanceOf(AppError));
    expect(result.current.error?.message).toBe('Session not found');
    expect(chat().sessionId).toBeUndefined();
  });

  it('waits out a refetch of stale messages rather than loading them', async () => {
    // A finished stream invalidates messages; load from the refetch, not the stale cache.
    // It invalidates by the parameterless key, a prefix of every per-session key.
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(getListMessagesQueryKey({ sessionId: SESSION_ID }), []);
    await queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey() });
    serveSession([aMessage('m1', SESSION_ID, 'user', 'fresh')]);

    renderHookWithQueryClient(() => useChatSession(SESSION_ID), { queryClient });

    await waitFor(() => expect(chat().history.map((m) => m.content)).toEqual(['fresh']));
  });

  it('keeps the live history of the session already in the chat', async () => {
    // Post-stream navigation arrives with the reply already streamed; reloading it would flash.
    useChatStreamStore.setState({
      sessionId: SESSION_ID,
      history: [{ id: 'live', role: 'assistant', content: 'streamed' }],
    });
    serveSession([aMessage('m1', SESSION_ID, 'assistant', 'streamed')]);

    const { result } = renderHookWithQueryClient(() => useChatSession(SESSION_ID));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(chat().history.map((m) => m.id)).toEqual(['live']);
  });

  it('clears the chat when the route leaves the session', () => {
    useChatStreamStore.setState({
      sessionId: SESSION_ID,
      history: [{ id: 'm1', role: 'user', content: 'stale' }],
    });

    renderHookWithQueryClient(() => useChatSession(undefined));

    expect(chat().history).toEqual([]);
    expect(chat().sessionId).toBeUndefined();
  });

  it('keeps the chat while a reply is still streaming', () => {
    useChatStreamStore.setState({
      isStreaming: true,
      sessionId: SESSION_ID,
      history: [{ id: 'm1', role: 'user', content: 'in flight' }],
    });

    renderHookWithQueryClient(() => useChatSession(undefined));

    expect(chat().history).toHaveLength(1);
    expect(chat().sessionId).toBe(SESSION_ID);
  });
});
