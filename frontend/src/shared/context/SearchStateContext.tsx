import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';

interface SearchStateContextValue {
  isSearchOpen: boolean;
  setIsSearchOpen: (value: boolean) => void;
}

const SearchStateContext = createContext<SearchStateContextValue | undefined>(undefined);

export function SearchStateProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const contextValue = useMemo(() => ({ isSearchOpen, setIsSearchOpen }), [isSearchOpen]);

  return <SearchStateContext.Provider value={contextValue}>{children}</SearchStateContext.Provider>;
}

export function useSearchState() {
  const context = useContext(SearchStateContext);
  if (!context) {
    throw new Error('useSearchState must be used within SearchStateProvider');
  }
  return context;
}
