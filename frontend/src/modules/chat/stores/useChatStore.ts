import { create } from 'zustand';
import type { Dispatch, SetStateAction } from 'react';
import type { ChatMessage } from '../types/types';

type Usage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} | null;

interface ChatState {
  history: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  usage: Usage;
  conversationId?: string;
  selectedModel: string;
  message: string;
  isSelectOpen: boolean;
  triggerWidth: number;
  setHistory: Dispatch<SetStateAction<ChatMessage[]>>;
  setIsStreaming: (isStreaming: boolean) => void;
  setError: (error: string | null) => void;
  setUsage: (usage: Usage) => void;
  setConversationId: (id: string | undefined) => void;
  setSelectedModel: (model: string) => void;
  setMessage: Dispatch<SetStateAction<string>>;
  setIsSelectOpen: (isOpen: boolean) => void;
  setTriggerWidth: (width: number) => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  history: [],
  isStreaming: false,
  error: null,
  usage: null,
  conversationId: undefined,
  selectedModel: 'gpt-4o-mini',
  message: '',
  isSelectOpen: false,
  triggerWidth: 120,
  setHistory: (history) =>
    set((state) => ({
      history: typeof history === 'function' ? history(state.history) : history,
    })),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setError: (error) => set({ error }),
  setUsage: (usage) => set({ usage }),
  setConversationId: (id) => set({ conversationId: id }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setMessage: (message) =>
    set((state) => ({
      message: typeof message === 'function' ? message(state.message) : message,
    })),
  setIsSelectOpen: (isOpen) => set({ isSelectOpen: isOpen }),
  setTriggerWidth: (width) => set({ triggerWidth: width }),
  resetChat: () =>
    set({
      history: [],
      isStreaming: false,
      error: null,
      usage: null,
      conversationId: undefined,
    }),
}));
