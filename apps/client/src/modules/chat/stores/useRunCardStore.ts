import { create } from 'zustand';
import type { RunCardState } from '@/modules/chat/types/types';

// Holds only what the User chose; a card with no choice follows its Run (open while it streams).
export const useRunCardStore = create<RunCardState>((set) => ({
  expanded: {},
  setExpanded: (runId, isExpanded) =>
    set((state) => ({ expanded: { ...state.expanded, [runId]: isExpanded } })),
}));
