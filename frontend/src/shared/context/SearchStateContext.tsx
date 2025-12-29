import { createContext, useContext, useState, type ReactNode } from 'react';

interface SearchStateContextValue {
  isSearchOpen: boolean;
  setIsSearchOpen: (value: boolean) => void;
}

const SearchStateContext = createContext<SearchStateContextValue | undefined>(undefined);

export function SearchStateProvider({ children }: { children: ReactNode }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <SearchStateContext.Provider value={{ isSearchOpen, setIsSearchOpen }}>
      {children}
    </SearchStateContext.Provider>
  );
}

export function useSearchState() {
  const context = useContext(SearchStateContext);
  if (!context) {
    throw new Error('useSearchState must be used within SearchStateProvider');
  }
  return context;
}
