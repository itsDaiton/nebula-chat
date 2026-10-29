import { create } from 'zustand';
import type { InspectorState } from '@/modules/inspector/types/types';
import { usePanelStore } from '@/shared/stores/usePanelStore';

export const useInspectorStore = create<InspectorState>()((set) => ({
  activeTab: 'session',
  selectedRunId: null,
  setActiveTab: (activeTab) => set({ activeTab }),
  openInspector: (activeTab, runId) => {
    set((state) => ({
      activeTab,
      selectedRunId: activeTab === 'run' && runId ? runId : state.selectedRunId,
    }));
    usePanelStore.getState().openRight();
  },
}));
