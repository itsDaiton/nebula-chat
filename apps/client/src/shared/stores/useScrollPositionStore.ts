import { create } from 'zustand';
import type { ScrollPositionState } from '@/shared/types/types';

export const useScrollPositionStore = create<ScrollPositionState>((set) => ({
  isAtBottom: true,
  markAtBottom: (isAtBottom) => set({ isAtBottom }),
}));
