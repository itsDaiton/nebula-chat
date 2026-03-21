import { create } from 'zustand';
import type { ViewportState } from '@/shared/types/types';

export const useViewportStore = create<ViewportState>((set) => ({
  viewportHeight: '100dvh',
  setViewportHeight: (height) => set({ viewportHeight: height }),
}));
