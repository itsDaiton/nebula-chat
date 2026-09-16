import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useDrawer } from '@/shared/hooks/useDrawer';
import { useDrawerStore } from '@/shared/stores/useDrawerStore';
import { useSearchStore } from '@/shared/stores/useSearchStore';

describe('useDrawer', () => {
  beforeEach(() => {
    useDrawerStore.setState({ isDrawerOpen: false });
    useSearchStore.setState({ isSearchOpen: false });
  });

  it('exposes both the drawer and search state together', () => {
    const { result } = renderHook(() => useDrawer());

    expect(result.current.isDrawerOpen).toBe(false);
    expect(result.current.isSearchOpen).toBe(false);
  });

  it('reflects a drawer change', () => {
    const { result } = renderHook(() => useDrawer());

    act(() => result.current.openDrawer());

    expect(result.current.isDrawerOpen).toBe(true);
  });

  it('keeps search state independent of the drawer', () => {
    const { result } = renderHook(() => useDrawer());

    act(() => result.current.toggleSearch());

    expect(result.current.isSearchOpen).toBe(true);
    expect(result.current.isDrawerOpen).toBe(false);
  });
});
