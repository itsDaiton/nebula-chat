import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useEscapeKey } from '@/shared/hooks/useEscapeKey';

const pressKey = (target: EventTarget, key: string, modifiers: Partial<KeyboardEventInit> = {}) => {
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true, ...modifiers }));
  });
};

describe('useEscapeKey', () => {
  it('fires on Escape', () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey(onEscape));

    pressKey(globalThis, 'Escape');

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('ignores other keys', () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey(onEscape));

    pressKey(globalThis, 'Enter');

    expect(onEscape).not.toHaveBeenCalled();
  });

  it('uses the latest callback after a re-render', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useEscapeKey(cb), {
      initialProps: { cb: first },
    });

    rerender({ cb: second });
    pressKey(globalThis, 'Escape');

    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });
});
