import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PANEL_STORAGE_KEY, usePanelStore } from '@/shared/stores/usePanelStore';

const defaults = {
  isLeftPanelOpen: true,
  isRightPanelOpen: true,
  isDrawerOpen: false,
  isSheetOpen: false,
};

// Zustand stores are module-level singletons, so state is reset explicitly
// rather than relying on a fresh import per test.
beforeEach(() => {
  localStorage.clear();
  usePanelStore.setState(defaults);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const stored = () => JSON.parse(localStorage.getItem(PANEL_STORAGE_KEY) ?? 'null');

describe('usePanelStore', () => {
  it('starts with both side panels open and nothing overlaid', () => {
    expect(usePanelStore.getState()).toMatchObject(defaults);
  });

  it('collapses and expands each side panel independently', () => {
    usePanelStore.getState().toggleLeftPanel();
    expect(usePanelStore.getState()).toMatchObject({
      isLeftPanelOpen: false,
      isRightPanelOpen: true,
    });

    usePanelStore.getState().toggleRightPanel();
    usePanelStore.getState().toggleLeftPanel();
    expect(usePanelStore.getState()).toMatchObject({
      isLeftPanelOpen: true,
      isRightPanelOpen: false,
    });
  });

  it('remembers the collapsed panels, but not an open drawer or sheet', () => {
    usePanelStore.getState().toggleLeftPanel();
    usePanelStore.getState().toggleDrawer();

    expect(stored().state).toEqual({ isLeftPanelOpen: false, isRightPanelOpen: true });
  });

  it('restores the remembered panels on reload', async () => {
    localStorage.setItem(
      PANEL_STORAGE_KEY,
      JSON.stringify({ state: { isLeftPanelOpen: false, isRightPanelOpen: false }, version: 0 }),
    );

    await usePanelStore.persist.rehydrate();

    expect(usePanelStore.getState()).toMatchObject({
      isLeftPanelOpen: false,
      isRightPanelOpen: false,
    });
  });

  it('toggles the drawer and the sheet, never both open at once', () => {
    usePanelStore.getState().toggleDrawer();
    expect(usePanelStore.getState()).toMatchObject({ isDrawerOpen: true, isSheetOpen: false });

    usePanelStore.getState().toggleSheet();
    expect(usePanelStore.getState()).toMatchObject({ isDrawerOpen: false, isSheetOpen: true });

    usePanelStore.getState().toggleSheet();
    expect(usePanelStore.getState()).toMatchObject({ isDrawerOpen: false, isSheetOpen: false });
  });

  it('closes the drawer and the sheet together', () => {
    usePanelStore.setState({ isDrawerOpen: true, isSheetOpen: true });

    usePanelStore.getState().closeMobilePanels();
    expect(usePanelStore.getState()).toMatchObject({ isDrawerOpen: false, isSheetOpen: false });
  });

  it('still toggles when storage refuses writes', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });

    usePanelStore.getState().toggleLeftPanel();

    expect(usePanelStore.getState().isLeftPanelOpen).toBe(false);
  });

  it('falls back to the defaults when storage refuses reads', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });

    await usePanelStore.persist.rehydrate();

    expect(usePanelStore.getState()).toMatchObject(defaults);
  });
});
