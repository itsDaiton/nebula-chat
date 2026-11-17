import { create } from 'zustand';
import type { UsageHoverState } from '@/modules/admin/types/types';

// The chart and the right panel are siblings, so the hovered day lives here.
export const useUsageHoverStore = create<UsageHoverState>((set) => ({
  day: null,
  setDay: (day) => set({ day }),
}));
