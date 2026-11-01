import { create } from 'zustand';
import type { SettingsDialogState } from '@/modules/settings/types/types';

export const useSettingsDialogStore = create<SettingsDialogState>((set) => ({
  isOpen: false,
  section: 'profile',
  openSettings: (section = 'profile') => set({ isOpen: true, section }),
  closeSettings: () => set({ isOpen: false }),
  setSection: (section) => set({ section }),
}));
