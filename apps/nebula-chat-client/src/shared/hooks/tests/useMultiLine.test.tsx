import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMultiLine } from '@/shared/hooks/useMultiLine';
import { useMultiLineStore } from '@/shared/stores/useMultiLineStore';
import { useSearchStore } from '@/shared/stores/useSearchStore';

const navigate = vi.fn();
vi.mock('react-router', () => ({ useNavigate: () => navigate }));

beforeEach(() => {
  vi.clearAllMocks();
  useMultiLineStore.setState({ multiLineMap: {} });
  useSearchStore.setState({ isSearchOpen: false });
});

describe('useMultiLine', () => {
  it('starts single-line for unmeasured content', () => {
    const { result } = renderHook(() => useMultiLine('hello'));

    expect(result.current.isMultiLine).toBe(false);
  });

  it('marks content as multi-line once it measures taller than one line', () => {
    const { result } = renderHook(() => useMultiLine('hello'));
    const node = document.createElement('div');
    vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({ height: 100 } as DOMRect);

    act(() => result.current.textRef(node));

    expect(useMultiLineStore.getState().multiLineMap['hello']).toBe(true);
  });

  it('leaves short content single-line', () => {
    const { result } = renderHook(() => useMultiLine('hello'));
    const node = document.createElement('div');
    vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({ height: 1 } as DOMRect);

    act(() => result.current.textRef(node));

    expect(useMultiLineStore.getState().multiLineMap['hello']).toBe(false);
  });

  it('drops the entry when the node detaches, so the map does not grow forever', () => {
    useMultiLineStore.setState({ multiLineMap: { hello: true } });
    const { result } = renderHook(() => useMultiLine('hello'));

    act(() => result.current.textRef(null));

    expect(useMultiLineStore.getState().multiLineMap).not.toHaveProperty('hello');
  });
});
