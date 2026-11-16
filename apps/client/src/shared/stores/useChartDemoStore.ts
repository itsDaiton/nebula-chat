import { create } from 'zustand';
import type { ChartDemoState } from '@/shared/types/types';

export const useChartDemoStore = create<ChartDemoState>()((set) => ({
  activeSeries: 'gpt-4.1-mini',
  hoverIndex: null,
  setActiveSeries: (activeSeries) => set({ activeSeries }),
  setHoverIndex: (hoverIndex) => set({ hoverIndex }),
}));
