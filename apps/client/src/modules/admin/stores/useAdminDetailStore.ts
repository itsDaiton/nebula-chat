import { create } from 'zustand';
import type { AdminDetailState } from '@/modules/admin/types/types';

export const useAdminDetailStore = create<AdminDetailState>((set) => ({
  selection: null,
  select: (selection) => set({ selection }),
  clear: () => set({ selection: null }),
}));
