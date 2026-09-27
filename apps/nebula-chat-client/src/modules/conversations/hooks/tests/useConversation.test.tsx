import { waitFor } from '@testing-library/react';
import { AppError } from '@nebula-chat/errors';
import { beforeEach, describe, expect, it } from 'vitest';
import { getGetConversationMockHandler } from '@/libs/api/generated/conversations/conversations.msw';
import { getListMessagesQueryKey } from '@/libs/api/generated/messages/messages';
import { getListMessagesMockHandler } from '@/libs/api/generated/messages/messages.msw';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { useConversation } from '@/modules/conversations/hooks/useConversation';
import { API_ROUTE, mockApiError } from '@/test/api';
import { server } from '@/test/msw';
import { createTestQueryClient, renderHookWithQueryClient } from '@/test/render';

const CONVERSATION_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '33333333-3333-4333-8333-333333333333';

const aMessage = (id: string, conversationId: string, role: string, content: string) => ({
  id,
  conversationId,
  role,
  content,
  tokenCount: null,
  cached: false,
  createdAt: '2026-01-01T00:00:00.000Z',
});

const serveConversation = (messages = [aMessage('m1', CONVERSATION_ID, 'user', 'a question')]) =>
  server.use(
    getGetConversationMockHandler({
      id: CONVERSATION_ID,
      title: 'Chat',
      createdAt: '2026-01-01T00:00:00.000Z',
    }),
    getListMessagesMockHandler(messages),
  );

const chat = () => useChatStreamStore.getState();

beforeEach(() => {
  useChatStreamStore.setState({
    history: [],
    isStreaming: false,
    isPostStreamNavigation: false,
    error: null,
    conversationId: undefined,
  });
});

describe('useConversation', () => {
  it('loads the conversation named in the route into the chat history', async () => {
    serveConversation([
      aMessage('m1', CONVERSATION_ID, 'user', 'a question'),
      aMessage('x1', OTHER_ID, 'user', 'another conversation'),
      aMessage('m2', CONVERSATION_ID, 'assistant', 'an answer'),
    ]);

    const { result } = renderHookWithQueryClient(() => useConversation(CONVERSATION_ID));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(chat().history).toEqual([
      { id: 'm1', role: 'user', content: 'a question' },
      { id: 'm2', role: 'assistant', content: 'an answer' },
    ]);
    expect(chat().conversationId).toBe(CONVERSATION_ID);
  });

  it('reports loading until the conversation has arrived', () => {
    serveConversation();

    const { result } = renderHookWithQueryClient(() => useConversation(CONVERSATION_ID));

    expect(result.current.isLoading).toBe(true);
  });

  it('surfaces a conversation the caller cannot see as a typed AppError', async () => {
    server.use(
      mockApiError('get', API_ROUTE.conversation, 404, {
        success: false,
        error: 'NotFound',
        message: 'Conversation not found',
      }),
      getListMessagesMockHandler([]),
    );

    const { result } = renderHookWithQueryClient(() => useConversation(CONVERSATION_ID));

    await waitFor(() => expect(result.current.error).toBeInstanceOf(AppError));
    expect(result.current.error?.message).toBe('Conversation not found');
    expect(chat().conversationId).toBeUndefined();
  });

  it('waits out a refetch of stale messages rather than loading them', async () => {
    // A finished stream invalidates messages; load from the refetch, not the stale cache.
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(getListMessagesQueryKey(), []);
    await queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey() });
    serveConversation([aMessage('m1', CONVERSATION_ID, 'user', 'fresh')]);

    renderHookWithQueryClient(() => useConversation(CONVERSATION_ID), { queryClient });

    await waitFor(() => expect(chat().history.map((m) => m.content)).toEqual(['fresh']));
  });

  it('keeps the live history of the conversation already in the chat', async () => {
    // Post-stream navigation arrives with the reply already streamed; reloading it would flash.
    useChatStreamStore.setState({
      conversationId: CONVERSATION_ID,
      history: [{ id: 'live', role: 'assistant', content: 'streamed' }],
    });
    serveConversation([aMessage('m1', CONVERSATION_ID, 'assistant', 'streamed')]);

    const { result } = renderHookWithQueryClient(() => useConversation(CONVERSATION_ID));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(chat().history.map((m) => m.id)).toEqual(['live']);
  });

  it('clears the chat when the route leaves the conversation', () => {
    useChatStreamStore.setState({
      conversationId: CONVERSATION_ID,
      history: [{ id: 'm1', role: 'user', content: 'stale' }],
    });

    renderHookWithQueryClient(() => useConversation(undefined));

    expect(chat().history).toEqual([]);
    expect(chat().conversationId).toBeUndefined();
  });

  it('keeps the chat while a reply is still streaming', () => {
    useChatStreamStore.setState({
      isStreaming: true,
      conversationId: CONVERSATION_ID,
      history: [{ id: 'm1', role: 'user', content: 'in flight' }],
    });

    renderHookWithQueryClient(() => useConversation(undefined));

    expect(chat().history).toHaveLength(1);
    expect(chat().conversationId).toBe(CONVERSATION_ID);
  });
});
