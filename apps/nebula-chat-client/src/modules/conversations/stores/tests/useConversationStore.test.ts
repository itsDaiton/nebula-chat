import { HttpResponse, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getGetConversationMockHandler } from '@/libs/api/generated/conversations/conversations.msw';
import { useConversationStore } from '@/modules/conversations/stores/useConversationStore';
import { useConversationsSearchStore } from '@/modules/conversations/stores/useConversationsSearchStore';
import { API_ROUTE, mockApiError } from '@/test/api';
import { server } from '@/test/msw';

const CONVERSATION_ID = '11111111-1111-4111-8111-111111111111';

const conversation = () => useConversationStore.getState();
beforeEach(() => {
  useConversationStore.setState({
    conversationId: null,
    conversation: null,
    isLoading: false,
    error: null,
  });
  useConversationsSearchStore.setState({
    searchQuery: '',
    debouncedQuery: '',
    searchResults: [],
    isSearching: false,
    error: null,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useConversationStore', () => {
  it('loads a conversation with its messages', async () => {
    const payload = {
      id: CONVERSATION_ID,
      title: 'Chat',
      messages: [],
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    server.use(getGetConversationMockHandler(payload));

    await conversation().fetchConversation(CONVERSATION_ID);

    expect(conversation().conversation).toEqual(payload);
    expect(conversation().conversationId).toBe(CONVERSATION_ID);
    expect(conversation().isLoading).toBe(false);
  });

  it('records a 404 as an error and drops any stale conversation', async () => {
    useConversationStore.setState({
      conversation: { id: 'old', title: 'Old', messages: [] } as never,
    });
    server.use(
      mockApiError('get', API_ROUTE.conversation, 404, { message: 'Conversation not found' }),
    );

    await conversation().fetchConversation(CONVERSATION_ID);

    expect(conversation().error).toBe('Conversation not found');
    expect(conversation().conversation).toBeNull();
  });

  it('ignores a duplicate request for the conversation already loading', async () => {
    useConversationStore.setState({ conversationId: CONVERSATION_ID, isLoading: true });

    await conversation().fetchConversation(CONVERSATION_ID);

    // Still loading: the call returned early rather than starting a second fetch.
    expect(conversation().isLoading).toBe(true);
  });

  it('refetches the current conversation', async () => {
    let calls = 0;
    server.use(
      http.get(API_ROUTE.conversation, () => {
        calls += 1;
        return HttpResponse.json({ id: CONVERSATION_ID, title: 'Chat', messages: [] });
      }),
    );
    await conversation().fetchConversation(CONVERSATION_ID);

    await conversation().refetch();

    expect(calls).toBe(2);
  });

  it('refetch is a no-op when nothing is loaded', async () => {
    await expect(conversation().refetch()).resolves.toBeUndefined();
    expect(conversation().conversationId).toBeNull();
  });

  it('clear resets the loaded conversation and error', () => {
    useConversationStore.setState({
      conversationId: CONVERSATION_ID,
      conversation: { id: CONVERSATION_ID } as never,
      error: 'boom',
    });

    conversation().clear();

    expect(conversation()).toMatchObject({
      conversationId: null,
      conversation: null,
      error: null,
    });
  });
});
