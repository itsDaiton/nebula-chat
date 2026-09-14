import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';

const breakpointValue = vi.hoisted(() => ({ current: undefined as boolean | undefined }));

vi.mock('@chakra-ui/react', () => ({
  useBreakpointValue: () => breakpointValue.current,
}));

beforeEach(() => {
  breakpointValue.current = undefined;
});

describe('useResponsiveLayout', () => {
  it('assumes mobile with panels hidden when the breakpoint is not yet resolved', () => {
    // Guessing desktop first would flash both side panels before hydration.
    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current).toEqual({
      isMobile: true,
      showSidePanels: false,
      showRightPanel: false,
    });
  });

  it('reports the resolved breakpoint once available', () => {
    breakpointValue.current = true;

    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current).toEqual({
      isMobile: true,
      showSidePanels: true,
      showRightPanel: true,
    });
  });

  it('reports a desktop layout when the breakpoint resolves false', () => {
    breakpointValue.current = false;

    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current).toEqual({
      isMobile: false,
      showSidePanels: false,
      showRightPanel: false,
    });
  });
});
