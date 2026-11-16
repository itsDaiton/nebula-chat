import { create } from 'zustand';
import type { UserActionState } from '@/modules/admin/types/types';

export const useUserActionStore = create<UserActionState>((set) => ({
  open: null,
  show: (open) => set({ open }),
  close: () => set({ open: null }),
}));
