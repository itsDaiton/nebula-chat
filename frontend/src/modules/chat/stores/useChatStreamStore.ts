import { create } from 'zustand';
import type { Dispatch, SetStateAction } from 'react';
import type { ChatMessage } from '../types/types';

type Usage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} | null;

interface ChatStreamState {
  history: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  usage: Usage;
  conversationId?: string;
  setHistory: Dispatch<SetStateAction<ChatMessage[]>>;
  setIsStreaming: (isStreaming: boolean) => void;
  setError: (error: string | null) => void;
  setUsage: (usage: Usage) => void;
  setConversationId: (id: string | undefined) => void;
}

export const useChatStreamStore = create<ChatStreamState>((set) => ({
  history: [],
  isStreaming: false,
  error: null,
  usage: null,
  conversationId: undefined,
  setHistory: (history) =>
    set((state) => ({
      history: typeof history === 'function' ? history(state.history) : history,
    })),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setError: (error) => set({ error }),
  setUsage: (usage) => set({ usage }),
  setConversationId: (id) => set({ conversationId: id }),
}));
