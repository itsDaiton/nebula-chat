import { beforeEach, describe, expect, it } from 'vitest';
import { useSearchStore } from '@/shared/stores/useSearchStore';

// Zustand stores are module-level singletons, so state is reset explicitly
// rather than relying on a fresh import per test.
beforeEach(() => {
  useSearchStore.setState({ isSearchOpen: false });
});

const isOpen = () => useSearchStore.getState().isSearchOpen;

describe('useSearchStore', () => {
  it('starts closed', () => {
    expect(isOpen()).toBe(false);
  });

  it('opens', () => {
    useSearchStore.getState().openSearch();

    expect(isOpen()).toBe(true);
  });

  it('closes', () => {
    useSearchStore.getState().openSearch();
    useSearchStore.getState().closeSearch();

    expect(isOpen()).toBe(false);
  });

  it('is idempotent when opened twice', () => {
    useSearchStore.getState().openSearch();
    useSearchStore.getState().openSearch();

    expect(isOpen()).toBe(true);
  });

  it('toggles from closed to open and back', () => {
    useSearchStore.getState().toggleSearch();
    expect(isOpen()).toBe(true);

    useSearchStore.getState().toggleSearch();
    expect(isOpen()).toBe(false);
  });
});
