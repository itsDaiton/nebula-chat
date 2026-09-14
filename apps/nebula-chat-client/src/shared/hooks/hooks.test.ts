import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDrawer } from '@/shared/hooks/useDrawer';
import { useEscapeKey } from '@/shared/hooks/useEscapeKey';
import { useEventListener } from '@/shared/hooks/useEventListener';
import { useKeyboardShortcut } from '@/shared/hooks/useKeyboardShortcut';
import { useOS } from '@/shared/hooks/useOS';
import { useDrawerStore } from '@/shared/stores/useDrawerStore';
import { useSearchStore } from '@/shared/stores/useSearchStore';

const pressKey = (target: EventTarget, key: string, modifiers: Partial<KeyboardEventInit> = {}) => {
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true, ...modifiers }));
  });
};

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

describe('useKeyboardShortcut', () => {
  it('fires on a plain key with no modifiers required', () => {
    const callback = vi.fn();
    renderHook(() => useKeyboardShortcut('k', callback));

    pressKey(document, 'k');

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not fire a plain shortcut when a modifier is held', () => {
    const callback = vi.fn();
    renderHook(() => useKeyboardShortcut('k', callback));

    pressKey(document, 'k', { ctrlKey: true });

    expect(callback).not.toHaveBeenCalled();
  });

  it('fires a ctrl shortcut on Ctrl', () => {
    const callback = vi.fn();
    renderHook(() => useKeyboardShortcut('k', callback, { ctrl: true }));

    pressKey(document, 'k', { ctrlKey: true });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('accepts Cmd as the ctrl modifier, so the shortcut works on macOS', () => {
    const callback = vi.fn();
    renderHook(() => useKeyboardShortcut('k', callback, { ctrl: true }));

    pressKey(document, 'k', { metaKey: true });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('requires the modifier when one is configured', () => {
    const callback = vi.fn();
    renderHook(() => useKeyboardShortcut('k', callback, { ctrl: true }));

    pressKey(document, 'k');

    expect(callback).not.toHaveBeenCalled();
  });

  it('matches the key case-insensitively', () => {
    const callback = vi.fn();
    renderHook(() => useKeyboardShortcut('k', callback));

    pressKey(document, 'K');

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('honours a required shift modifier', () => {
    const callback = vi.fn();
    renderHook(() => useKeyboardShortcut('k', callback, { shift: true }));

    pressKey(document, 'k');
    expect(callback).not.toHaveBeenCalled();

    pressKey(document, 'k', { shiftKey: true });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('honours a required alt modifier', () => {
    const callback = vi.fn();
    renderHook(() => useKeyboardShortcut('k', callback, { alt: true }));

    pressKey(document, 'k', { altKey: true });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('suppresses the browser default for a matched shortcut', () => {
    renderHook(() => useKeyboardShortcut('k', vi.fn(), { ctrl: true }));
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, cancelable: true });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores a different key entirely', () => {
    const callback = vi.fn();
    renderHook(() => useKeyboardShortcut('k', callback));

    pressKey(document, 'j');

    expect(callback).not.toHaveBeenCalled();
  });
});

describe('useOS', () => {
  it.each([
    ['MacIntel', 'mac'],
    ['iPhone', 'mac'],
    ['Win32', 'windows'],
    ['Linux x86_64', 'windows'],
  ])('maps platform %s to %s', (platform, expected) => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(platform);

    const { result } = renderHook(() => useOS());

    expect(result.current).toBe(expected);
  });
});

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
