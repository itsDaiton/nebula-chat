import { create } from 'zustand';
import type { InspectorState } from '@/modules/inspector/types/types';
import { usePanelStore } from '@/shared/stores/usePanelStore';

export const useInspectorStore = create<InspectorState>()((set) => ({
  selectedRunId: null,
  selectRun: (runId) => {
    set({ selectedRunId: runId });
    usePanelStore.getState().openRight();
  },
  showRun: (runId) => {
    set({ selectedRunId: runId });
    usePanelStore.getState().openRightPanel();
  },
  restoreRun: (selectedRunId) => set({ selectedRunId }),
}));
