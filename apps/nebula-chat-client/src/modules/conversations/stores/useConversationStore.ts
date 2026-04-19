import { create } from 'zustand';
import type { ConversationWithMessages } from '@/modules/conversations/types/types';
import { SERVER_CONFIG } from '@/shared/config/serverConfig';
import { handleHttpError, handleNetworkError } from '@/shared/utils/errorHandler';

type ConversationState = {
  conversationId: string | null;
  conversation: ConversationWithMessages | null;
  isLoading: boolean;
  error: string | null;
  fetchConversation: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
  clear: () => void;
};

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversationId: null,
  conversation: null,
  isLoading: false,
  error: null,

  fetchConversation: async (id: string) => {
    const { conversationId: currentId, isLoading } = get();
    if (currentId === id && isLoading) return;
    set({ conversationId: id, isLoading: true, error: null });
    try {
      const response = await fetch(SERVER_CONFIG.getApiEndpoint(`/api/conversations/${id}`));
      if (!response.ok) {
        await handleHttpError(response);
      }
      const data = await response.json();
      set({ conversation: data });
    } catch (err) {
      try {
        handleNetworkError(err);
      } catch (handledError) {
        set({
          error: handledError instanceof Error ? handledError.message : 'Unknown error occurred',
          conversation: null,
        });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  refetch: async () => {
    const { conversationId, fetchConversation } = get();
    if (!conversationId) return;
    await fetchConversation(conversationId);
  },

  clear: () => set({ conversationId: null, conversation: null, error: null }),
}));
