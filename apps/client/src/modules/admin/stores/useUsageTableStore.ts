import { create } from 'zustand';
import type { UsageTableState } from '@/modules/admin/types/types';

export const useUsageTableStore = create<UsageTableState>((set) => ({
  asTable: false,
  toggle: () => set((state) => ({ asTable: !state.asTable })),
}));
