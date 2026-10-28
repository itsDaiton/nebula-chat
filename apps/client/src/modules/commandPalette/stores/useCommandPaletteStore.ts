import { create } from 'zustand';
import type { CommandPaletteState } from '@/modules/commandPalette/types/types';

const SEARCH_DEBOUNCE_MS = 300;

// Module-level timer, outside React and the store state.
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Whether the palette is open lives in `useSearchStore`; this holds its registry and typed text.
export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  actions: [],
  query: '',
  debouncedQuery: '',

  register: (added) => {
    const ids = new Set(added.map((action) => action.id));
    set((state) => ({ actions: [...state.actions.filter((a) => !ids.has(a.id)), ...added] }));
    return () => set((state) => ({ actions: state.actions.filter((a) => !ids.has(a.id)) }));
  },

  setQuery: (query) => {
    set({ query });
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      set({ debouncedQuery: query });
    }, SEARCH_DEBOUNCE_MS);
  },

  clearQuery: () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    set({ query: '', debouncedQuery: '' });
  },
}));
