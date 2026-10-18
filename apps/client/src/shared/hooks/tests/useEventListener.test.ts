import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useEventListener } from '@/shared/hooks/useEventListener';

describe('useEventListener', () => {
  it('invokes the handler when the event fires', () => {
    const handler = vi.fn();
    renderHook(() => useEventListener('custom', handler));

    act(() => {
      globalThis.dispatchEvent(new Event('custom'));
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('detaches the listener on unmount', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useEventListener('custom', handler));

    unmount();
    globalThis.dispatchEvent(new Event('custom'));

    expect(handler).not.toHaveBeenCalled();
  });

  it('calls the latest handler without re-subscribing', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ h }) => useEventListener('custom', h), {
      initialProps: { h: first },
    });

    rerender({ h: second });
    act(() => {
      globalThis.dispatchEvent(new Event('custom'));
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('attaches to a supplied element instead of the global target', () => {
    const handler = vi.fn();
    const element = document.createElement('div');
    renderHook(() => useEventListener('custom', handler, element));

    act(() => {
      globalThis.dispatchEvent(new Event('custom'));
    });
    expect(handler).not.toHaveBeenCalled();

    act(() => {
      element.dispatchEvent(new Event('custom'));
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('tolerates a target without addEventListener', () => {
    expect(() =>
      renderHook(() => useEventListener('custom', vi.fn(), {} as EventTarget)),
    ).not.toThrow();
  });
});
