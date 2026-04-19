import { create } from 'zustand';
import type { MessageState } from '@/modules/chat/types/types';

export const useMessageStore = create<MessageState>((set) => ({
  message: '',
  setMessage: (message) =>
    set((state) => ({
      message: typeof message === 'function' ? message(state.message) : message,
    })),
}));
