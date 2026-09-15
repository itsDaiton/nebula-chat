import { beforeEach, describe, expect, it } from 'vitest';
import { getGetConversationMockHandler } from '@/libs/api/generated/conversations/conversations.msw';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { useConversationStore } from '@/modules/conversations/stores/useConversationStore';
import { server } from '@/test/msw';
import '@/modules/chat/stores/chatConversationSync';

const CONVERSATION_ID = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  useConversationStore.setState({
    conversationId: null,
    conversation: null,
    isLoading: false,
    error: null,
  });
  useChatStreamStore.setState({ history: [], conversationId: undefined, isStreaming: false });
});

describe('chatConversationSync', () => {
  it('replays a loaded conversation into the chat history', async () => {
    useConversationStore.setState({ isLoading: true, conversationId: CONVERSATION_ID });
    useConversationStore.setState({
      isLoading: false,
      conversation: {
        id: CONVERSATION_ID,
        title: 'Chat',
        createdAt: '2026-01-01T00:00:00.000Z',
        messages: [
          { id: 'm1', role: 'user', content: 'a question', createdAt: '2026-01-01T00:00:00.000Z' },
          {
            id: 'm2',
            role: 'assistant',
            content: 'an answer',
            createdAt: '2026-01-01T00:00:01.000Z',
          },
        ],
      },
    });

    expect(useChatStreamStore.getState().history).toEqual([
      { id: 'm1', role: 'user', content: 'a question' },
      { id: 'm2', role: 'assistant', content: 'an answer' },
    ]);
    expect(useChatStreamStore.getState().conversationId).toBe(CONVERSATION_ID);
  });

  it('clears the history when the conversation is unset', () => {
    useConversationStore.setState({ conversationId: CONVERSATION_ID });
    useChatStreamStore.setState({ history: [{ id: 'm1', role: 'user', content: 'stale' }] });

    useConversationStore.setState({ conversationId: null });

    expect(useChatStreamStore.getState().history).toEqual([]);
    expect(useChatStreamStore.getState().conversationId).toBeUndefined();
  });

  /**
   * KNOWN BUG, pinned rather than fixed here — the fix is a backend contract
   * change, not a testing one.
   *
   * `GET /api/conversations/:conversationId` is documented and serialized as
   * `{ id, title, createdAt }`: the repository selects from the `conversations`
   * table alone, and the Zod response schema strips anything else. The client
   * nonetheless types the result `ConversationWithMessages` and this subscriber
   * calls `mapConversationMessages(state.conversation.messages)`, which does an
   * unguarded `.map` on `undefined`. Opening any existing conversation therefore
   * throws inside the store's `set`, is caught by `fetchConversation`, and leaves
   * the user looking at a load error with no history.
   *
   * It stayed invisible because the old hand-written msw mocks invented a
   * `messages` array the API never sends. The Orval-generated handler cannot:
   * its payload type comes from the OpenAPI document, so a spec-shaped response
   * is the only thing it can produce — which is what surfaced this.
   *
   * The throw lands in `fetchConversation`'s `finally`, not its `try`, so the
   * store's own error handling never sees it: the promise rejects, the history
   * stays empty, and nothing sets `error`. The fix is to make the endpoint
   * return the conversation's messages (repository join + response schema +
   * regenerated spec and client), so this test asserts the broken behaviour
   * deliberately. It fails the moment the contract is corrected, and that is
   * the signal to delete it.
   */
  it('throws for a conversation shaped the way the API documents it', async () => {
    server.use(
      getGetConversationMockHandler({
        id: CONVERSATION_ID,
        title: 'Chat',
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    );

    await expect(
      useConversationStore.getState().fetchConversation(CONVERSATION_ID),
    ).rejects.toThrow(/Cannot read properties of undefined/);

    expect(useChatStreamStore.getState().history).toEqual([]);
    expect(useConversationStore.getState().error).toBeNull();
  });
});
