import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PANEL_STORAGE_KEY, usePanelStore } from '@/shared/stores/usePanelStore';

beforeEach(() => {
  localStorage.clear();
  usePanelStore.setState({ leftOpen: true, rightOpen: true, sheetOpen: false });
});

const state = () => usePanelStore.getState();

describe('usePanelStore', () => {
  it('starts with both side panels open and the sheet closed', () => {
    expect(state()).toMatchObject({ leftOpen: true, rightOpen: true, sheetOpen: false });
  });

  it('toggles each side panel on its own', () => {
    state().toggleLeft();
    expect(state()).toMatchObject({ leftOpen: false, rightOpen: true });

    state().toggleRight();
    expect(state()).toMatchObject({ leftOpen: false, rightOpen: false });
  });

  it('persists the panels but not the sheet', () => {
    state().toggleLeft();
    state().toggleSheet();

    expect(JSON.parse(localStorage.getItem(PANEL_STORAGE_KEY) ?? '{}').state).toEqual({
      leftOpen: false,
      rightOpen: true,
    });
  });

  it('restores the saved panels on rehydrate', async () => {
    localStorage.setItem(
      PANEL_STORAGE_KEY,
      JSON.stringify({ state: { leftOpen: false, rightOpen: false }, version: 0 }),
    );

    await usePanelStore.persist.rehydrate();

    expect(state()).toMatchObject({ leftOpen: false, rightOpen: false });
  });

  it('keeps working when storage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    await usePanelStore.persist.rehydrate();
    state().toggleRight();

    expect(state().rightOpen).toBe(false);
    vi.restoreAllMocks();
  });

  it('toggles and closes the sheet', () => {
    state().toggleSheet();
    expect(state().sheetOpen).toBe(true);

    state().closeSheet();
    expect(state().sheetOpen).toBe(false);
  });

  it('opens the Inspector as both the panel and the sheet', () => {
    usePanelStore.setState({ rightOpen: false });

    state().openRight();

    expect(state()).toMatchObject({ rightOpen: true, sheetOpen: true });
  });
});
