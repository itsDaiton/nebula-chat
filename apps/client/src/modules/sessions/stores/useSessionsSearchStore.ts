import { create } from 'zustand';
import type { SessionsSearchState } from '@/modules/sessions/types/types';

const SEARCH_DEBOUNCE_MS = 300;

// Module-level timer — intentionally outside React and the store state
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Only the typed text lives here; the results are a query in `useSessionsSearch`.
export const useSessionsSearchStore = create<SessionsSearchState>((set) => ({
  searchQuery: '',
  debouncedQuery: '',

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      set({ debouncedQuery: query });
    }, SEARCH_DEBOUNCE_MS);
  },

  clearSearch: () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    set({ searchQuery: '', debouncedQuery: '' });
  },
}));
