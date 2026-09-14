import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useViewportHeight } from '@/shared/hooks/useViewportHeight';
import { useMultiLineStore } from '@/shared/stores/useMultiLineStore';
import { useSearchStore } from '@/shared/stores/useSearchStore';

const navigate = vi.fn();
vi.mock('react-router', () => ({ useNavigate: () => navigate }));

beforeEach(() => {
  vi.clearAllMocks();
  useMultiLineStore.setState({ multiLineMap: {} });
  useSearchStore.setState({ isSearchOpen: false });
});

describe('useViewportHeight', () => {
  it('reports the current viewport height in pixels', () => {
    const { result } = renderHook(() => useViewportHeight());

    expect(result.current).toMatch(/^\d+px$/);
  });

  it('updates when the window resizes', () => {
    const { result } = renderHook(() => useViewportHeight());
    const before = result.current;

    act(() => {
      Object.defineProperty(window, 'innerHeight', { value: 500, configurable: true });
      Object.defineProperty(window, 'visualViewport', { value: null, configurable: true });
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).not.toBe(before);
    expect(result.current).toBe('500px');
  });
});
