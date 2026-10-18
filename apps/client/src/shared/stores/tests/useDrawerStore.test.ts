import { beforeEach, describe, expect, it } from 'vitest';
import { useDrawerStore } from '@/shared/stores/useDrawerStore';

// Zustand stores are module-level singletons, so state is reset explicitly
// rather than relying on a fresh import per test.
beforeEach(() => {
  useDrawerStore.setState({ isDrawerOpen: false });
});

const isOpen = () => useDrawerStore.getState().isDrawerOpen;

describe('useDrawerStore', () => {
  it('starts closed', () => {
    expect(isOpen()).toBe(false);
  });

  it('opens', () => {
    useDrawerStore.getState().openDrawer();

    expect(isOpen()).toBe(true);
  });

  it('closes', () => {
    useDrawerStore.getState().openDrawer();
    useDrawerStore.getState().closeDrawer();

    expect(isOpen()).toBe(false);
  });

  it('is idempotent when opened twice', () => {
    useDrawerStore.getState().openDrawer();
    useDrawerStore.getState().openDrawer();

    expect(isOpen()).toBe(true);
  });

  it('toggles from closed to open and back', () => {
    useDrawerStore.getState().toggleDrawer();
    expect(isOpen()).toBe(true);

    useDrawerStore.getState().toggleDrawer();
    expect(isOpen()).toBe(false);
  });
});
