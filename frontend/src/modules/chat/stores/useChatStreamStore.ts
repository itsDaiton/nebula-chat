import { create } from 'zustand';
import type { ChatStreamState } from '@/modules/chat/types/types';

export const useChatStreamStore = create<ChatStreamState>((set) => ({
  history: [],
  isStreaming: false,
  isPostStreamNavigation: false,
  error: null,
  usage: null,
  conversationId: undefined,
  setHistory: (history) =>
    set((state) => ({
      history: typeof history === 'function' ? history(state.history) : history,
    })),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setIsPostStreamNavigation: (v) => set({ isPostStreamNavigation: v }),
  setError: (error) => set({ error }),
  setUsage: (usage) => set({ usage }),
  setConversationId: (id) => set({ conversationId: id }),
}));
