import { create } from 'zustand';
import type { Dispatch, SetStateAction } from 'react';

interface MessageState {
  message: string;
  setMessage: Dispatch<SetStateAction<string>>;
}

export const useMessageStore = create<MessageState>((set) => ({
  message: '',
  setMessage: (message) =>
    set((state) => ({
      message: typeof message === 'function' ? message(state.message) : message,
    })),
}));
