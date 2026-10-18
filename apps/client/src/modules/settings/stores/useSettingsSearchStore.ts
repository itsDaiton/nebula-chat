import { create } from 'zustand';
import type { SettingsSearchState } from '@/modules/settings/types/types';

export const useSettingsSearchStore = create<SettingsSearchState>((set) => ({
  query: '',
  searchSettings: (query) => set({ query }),
  clearSearch: () => set({ query: '' }),
}));
