import { create } from 'zustand';
import type { SettingsDialogState } from '@/modules/settings/types/types';

export const useSettingsDialogStore = create<SettingsDialogState>((set) => ({
  isOpen: false,
  section: 'profile',
  query: '',
  openSettings: (section = 'profile') => set({ isOpen: true, section }),
  closeSettings: () => set({ isOpen: false, query: '' }),
  setSection: (section) => set({ section }),
  setQuery: (query) => set({ query }),
}));
