import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';

const viewport = vi.hoisted(() => ({
  width: 0,
  listeners: new Set<() => void>(),
}));

const resize = (width: number) => {
  viewport.width = width;
  act(() => viewport.listeners.forEach((listener) => listener()));
};

const MIN_WIDTH = /min-width: (\d+)em/;

beforeEach(() => {
  viewport.width = 0;
  viewport.listeners.clear();
  vi.stubGlobal('matchMedia', (query: string) => {
    const minWidth = Number(MIN_WIDTH.exec(query)?.[1]) * 16;
    return {
      get matches() {
        return viewport.width >= minWidth;
      },
      addEventListener: (_: string, listener: () => void) => viewport.listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => viewport.listeners.delete(listener),
    };
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useResponsiveLayout', () => {
  it('is mobile with both side panels hidden on a narrow viewport', () => {
    resize(600);

    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current).toEqual({
      isMobile: true,
      showSidePanels: false,
      showRightPanel: false,
    });
  });

  it('shows the side panels, but not the right panel, on a laptop-wide viewport', () => {
    resize(1100);

    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current).toEqual({
      isMobile: false,
      showSidePanels: true,
      showRightPanel: false,
    });
  });

  it('shows every panel on a wide viewport', () => {
    resize(1400);

    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current).toEqual({
      isMobile: false,
      showSidePanels: true,
      showRightPanel: true,
    });
  });

  it('follows the viewport as it is resized', () => {
    resize(600);
    const { result } = renderHook(() => useResponsiveLayout());

    resize(1400);

    expect(result.current.showRightPanel).toBe(true);
    expect(result.current.isMobile).toBe(false);
  });
});
