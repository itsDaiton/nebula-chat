import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { InspectorState } from '@/modules/inspector/types/types';
import { safeStorage, usePanelStore } from '@/shared/stores/usePanelStore';

export const INSPECTOR_STORAGE_KEY = 'nebula-inspector';

export const useInspectorStore = create<InspectorState>()(
  persist(
    (set) => ({
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
    }),
    {
      name: INSPECTOR_STORAGE_KEY,
      storage: createJSONStorage(() => safeStorage),
      // The tab sets the panel's width, so it is remembered with the panel; a Run is not.
      partialize: ({ activeTab }) => ({ activeTab }),
    },
  ),
);
