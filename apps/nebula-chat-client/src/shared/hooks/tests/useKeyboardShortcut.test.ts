import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useKeyboardShortcut } from '@/shared/hooks/useKeyboardShortcut';

const pressKey = (target: EventTarget, key: string, modifiers: Partial<KeyboardEventInit> = {}) => {
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true, ...modifiers }));
  });
};

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
