import { create } from 'zustand';
import type { ConversationsSearchState } from '@/modules/conversations/types/types';

const SEARCH_DEBOUNCE_MS = 300;

// Module-level timer — intentionally outside React and the store state
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Only the text being typed is client state; the results are server state,
// fetched by `useConversationsSearch` for the settled `debouncedQuery`.
export const useConversationsSearchStore = create<ConversationsSearchState>((set) => ({
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
