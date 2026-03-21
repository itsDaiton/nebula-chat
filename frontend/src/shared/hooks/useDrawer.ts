import { useDrawerStore } from '../stores/useDrawerStore';
import { useSearchStore } from '../stores/useSearchStore';

export const useDrawer = () => {
  const { isDrawerOpen, openDrawer, closeDrawer, toggleDrawer } = useDrawerStore();
  const { isSearchOpen, openSearch, closeSearch, toggleSearch } = useSearchStore();

  return {
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    isSearchOpen,
    openSearch,
    closeSearch,
    toggleSearch,
  };
};
