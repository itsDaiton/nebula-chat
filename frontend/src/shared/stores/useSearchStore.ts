import { create } from 'zustand';

interface SearchState {
  isSearchOpen: boolean;
  setIsSearchOpen: (value: boolean) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  isSearchOpen: false,
  setIsSearchOpen: (value) => set({ isSearchOpen: value }),
}));
