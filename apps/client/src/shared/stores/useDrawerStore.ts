import { create } from 'zustand';
import type { DrawerState } from '@/shared/types/types';

export const useDrawerStore = create<DrawerState>((set) => ({
  isDrawerOpen: false,
  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),
  toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
}));
