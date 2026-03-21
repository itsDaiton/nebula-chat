import { create } from 'zustand';

interface ViewportState {
  viewportHeight: string;
  setViewportHeight: (height: string) => void;
}

export const useViewportStore = create<ViewportState>((set) => ({
  viewportHeight: '100dvh',
  setViewportHeight: (height) => set({ viewportHeight: height }),
}));
