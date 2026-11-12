import { create } from 'zustand';
import type { ChatStreamState } from '@/modules/chat/types/types';
import { IDLE_REPLY } from '@/modules/chat/utils/replyState';

export const useChatStreamStore = create<ChatStreamState>((set) => ({
  history: [],
  reply: IDLE_REPLY,
  usage: null,
  sessionId: undefined,
  streamId: null,
  isMessageAllowanceReached: false,
  cancelledRunId: null,
  setHistory: (history) =>
    set((state) => ({
      history: typeof history === 'function' ? history(state.history) : history,
    })),
  setUsage: (usage) => set({ usage }),
  setSessionId: (id) => set({ sessionId: id }),
  clearMessageAllowanceReached: () => set({ isMessageAllowanceReached: false }),
}));
