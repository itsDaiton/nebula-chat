import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { PanelState } from '@/shared/types/types';

export const PANEL_STORAGE_KEY = 'nebula-chat:panels';

// Private windows and blocked site data throw on access; the panels then just aren't remembered.
const safeLocalStorage: StateStorage = {
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
      // Not remembered this time.
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // Nothing to forget.
    }
  },
};

// The side panels' collapse is remembered on desktop; the mobile drawer and sheet always start closed.
export const usePanelStore = create<PanelState>()(
  persist(
    (set) => ({
      isLeftPanelOpen: true,
      isRightPanelOpen: true,
      isDrawerOpen: false,
      isSheetOpen: false,
      toggleLeftPanel: () => set((state) => ({ isLeftPanelOpen: !state.isLeftPanelOpen })),
      toggleRightPanel: () => set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen })),
      openDrawer: () => set({ isDrawerOpen: true, isSheetOpen: false }),
      openSheet: () => set({ isSheetOpen: true, isDrawerOpen: false }),
      closeMobilePanels: () => set({ isDrawerOpen: false, isSheetOpen: false }),
    }),
    {
      name: PANEL_STORAGE_KEY,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: ({ isLeftPanelOpen, isRightPanelOpen }) => ({
        isLeftPanelOpen,
        isRightPanelOpen,
      }),
    },
  ),
);
