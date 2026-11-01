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
      responseFont: 'match',
      transcriptSize: 'medium',
      transcriptWidth: 'narrow',
      motion: 'system',
      setAppearance: (values) => set(values),
    }),
    { name: APPEARANCE_STORAGE_KEY, storage: createJSONStorage(() => safeStorage) },
  ),
);

// The tokens live in CSS; attributes on the document switch them everywhere, auth pages included.
const applyAppearance = ({
  font,
  responseFont,
  transcriptSize,
  transcriptWidth,
  motion,
}: AppearanceState) => {
  const { dataset } = document.documentElement;
  dataset.font = font;
  dataset.responseFont = responseFont;
  dataset.transcriptSize = transcriptSize;
  dataset.transcriptWidth = transcriptWidth;
  dataset.motion = motion;
};
applyAppearance(useAppearanceStore.getState());
useAppearanceStore.subscribe(applyAppearance);
