import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PanelState } from '@/shared/types/types';
import { safeStorage } from '@/shared/utils/safeStorage';

export const PANEL_STORAGE_KEY = 'nebula-panels';

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
