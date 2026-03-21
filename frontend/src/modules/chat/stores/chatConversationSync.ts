import { useConversationStore } from '@/modules/conversations/stores/useConversationStore';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { mapConversationMessages } from '@/modules/chat/utils/mapConversationMessages';

let syncedConversationId: string | null = null;

useConversationStore.subscribe((state, prevState) => {
  const { isStreaming } = useChatStreamStore.getState();

  if (state.isLoading && state.conversationId !== prevState.conversationId && !isStreaming) {
    syncedConversationId = null;
    // Only wipe history if the stream store isn't already showing this conversation
    // (e.g. after streaming creates a new conversation — history is already correct)
    const { conversationId: chatConvId } = useChatStreamStore.getState();
    if (chatConvId !== state.conversationId) {
      useChatStreamStore.setState({ history: [] });
    }
    return;
  }

  if (!state.isLoading && prevState.isLoading && state.conversation) {
    const { id } = state.conversation;
    if (id !== syncedConversationId) {
      syncedConversationId = id;
      useChatStreamStore.setState({
        history: mapConversationMessages(state.conversation.messages),
        conversationId: id,
      });
    }
    return;
  }

  if (!state.conversationId && prevState.conversationId && !isStreaming) {
    syncedConversationId = null;
    useChatStreamStore.setState({ history: [], conversationId: undefined });
  }
});
