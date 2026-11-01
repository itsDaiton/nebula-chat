import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { AppearanceState } from '@/modules/settings/types/types';

export const APPEARANCE_STORAGE_KEY = 'nebula-appearance';

// localStorage throws when blocked or full; the preference then lasts until reload.
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

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      font: 'geist',
      setFont: (font) => set({ font }),
    }),
    { name: APPEARANCE_STORAGE_KEY, storage: createJSONStorage(() => safeStorage) },
  ),
);

// The font token lives in CSS; the attribute switches it for the whole document, auth pages included.
const applyFont = ({ font }: AppearanceState) => {
  document.documentElement.dataset.font = font;
};
applyFont(useAppearanceStore.getState());
useAppearanceStore.subscribe(applyFont);
