import { create } from 'zustand';
import type { Conversation } from '@/modules/conversations/types/types';
import { SERVER_CONFIG } from '@/shared/config/serverConfig';
import { handleHttpError, handleNetworkError } from '@/shared/utils/errorHandler';

// Module-level timer — intentionally outside React and the store state
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

type ConversationsSearchState = {
  searchQuery: string;
  debouncedQuery: string;
  searchResults: Conversation[];
  isSearching: boolean;
  error: string | null;
  setSearchQuery: (query: string) => void;
  search: (query: string) => Promise<void>;
  clearResults: () => void;
};

export const useConversationsSearchStore = create<ConversationsSearchState>((set, get) => ({
  searchQuery: '',
  debouncedQuery: '',
  searchResults: [],
  isSearching: false,
  error: null,

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      set({ debouncedQuery: query });
      void get().search(query);
    }, 300);
  },

  search: async (query: string) => {
    if (!query.trim()) {
      set({ searchResults: [], error: null });
      return;
    }
    set({ isSearching: true, error: null });
    try {
      const response = await fetch(
        SERVER_CONFIG.getApiEndpoint(
          `/api/conversations/search?q=${encodeURIComponent(query)}`,
        ),
      );
      if (!response.ok) {
        await handleHttpError(response);
      }
      const data = await response.json();
      set({ searchResults: data });
    } catch (err) {
      try {
        handleNetworkError(err);
      } catch (handledError) {
        set({ error: handledError instanceof Error ? handledError.message : 'Search failed' });
      }
    } finally {
      set({ isSearching: false });
    }
  },

  clearResults: () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    set({ searchQuery: '', debouncedQuery: '', searchResults: [], error: null, isSearching: false });
  },
}));
