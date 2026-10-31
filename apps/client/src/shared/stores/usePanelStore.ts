import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type { PanelState } from '@/shared/types/types';

export const PANEL_STORAGE_KEY = 'nebula-panels';

// localStorage throws when blocked or full; the panels then just forget their state.
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // not remembered
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // not remembered
    }
  },
};

export const usePanelStore = create<PanelState>()(
  persist(
    (set) => ({
      leftOpen: true,
      rightOpen: true,
      sheetOpen: false,
      toggleLeft: () => set((state) => ({ leftOpen: !state.leftOpen })),
      toggleRight: () => set((state) => ({ rightOpen: !state.rightOpen })),
      // The layout shows one of the two; the other stays harmless until AppShell resets it.
      openRight: () => set({ rightOpen: true, sheetOpen: true }),
      closeSheet: () => set({ sheetOpen: false }),
      toggleSheet: () => set((state) => ({ sheetOpen: !state.sheetOpen })),
    }),
    {
      name: PANEL_STORAGE_KEY,
      storage: createJSONStorage(() => safeStorage),
      // The sheet is a mobile overlay: it never survives a reload.
      partialize: ({ leftOpen, rightOpen }) => ({ leftOpen, rightOpen }),
    },
  ),
);
