import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useKeyboardHandler } from '@/shared/hooks/useKeyboardHandler';
import { useMultiLineStore } from '@/shared/stores/useMultiLineStore';
import { useSearchStore } from '@/shared/stores/useSearchStore';

const navigate = vi.fn();
vi.mock('react-router', () => ({ useNavigate: () => navigate }));

const pressKey = (key: string, init: Partial<KeyboardEventInit> = {}, target?: EventTarget) => {
  act(() => {
    const event = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true, ...init });
    (target ?? globalThis).dispatchEvent(event);
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  useMultiLineStore.setState({ multiLineMap: {} });
  useSearchStore.setState({ isSearchOpen: false });
});

describe('useKeyboardHandler', () => {
  const setup = (overrides: Partial<Parameters<typeof useKeyboardHandler>[0]> = {}) => {
    const handleMessageSend = vi.fn();
    const hook = renderHook(() =>
      useKeyboardHandler({
        message: 'hello',
        isLoading: false,
        handleMessageSend,
        ...overrides,
      }),
    );
    return { handleMessageSend, ...hook };
  };

  it('sends on Enter when there is a message', () => {
    const { handleMessageSend } = setup();

    pressKey('Enter');

    expect(handleMessageSend).toHaveBeenCalledTimes(1);
  });

  it('does not send an empty message', () => {
    const { handleMessageSend } = setup({ message: '   ' });

    pressKey('Enter');

    expect(handleMessageSend).not.toHaveBeenCalled();
  });

  it('does not send while a reply is loading', () => {
    const { handleMessageSend } = setup({ isLoading: true });

    pressKey('Enter');

    expect(handleMessageSend).not.toHaveBeenCalled();
  });

  it('focuses the input when the user starts typing anywhere on the page', () => {
    const { result } = setup();
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    result.current.inputRef.current = textarea;
    const focus = vi.spyOn(textarea, 'focus');

    pressKey('a');

    expect(focus).toHaveBeenCalled();
    textarea.remove();
  });

  it('does not steal focus while the search box is open', () => {
    // Set before rendering: the hook reads isSearchOpen through a subscription,
    // so flipping it afterwards would need an act() re-render to be observed.
    useSearchStore.setState({ isSearchOpen: true });
    const { result } = setup();
    const textarea = document.createElement('textarea');
    result.current.inputRef.current = textarea;
    const focus = vi.spyOn(textarea, 'focus');

    pressKey('a');

    expect(focus).not.toHaveBeenCalled();
  });

  it('ignores modifier combinations, so browser shortcuts still work', () => {
    const { result } = setup();
    const textarea = document.createElement('textarea');
    result.current.inputRef.current = textarea;
    const focus = vi.spyOn(textarea, 'focus');

    pressKey('a', { metaKey: true });

    expect(focus).not.toHaveBeenCalled();
  });

  it('does not redirect typing that is already going into an input', () => {
    const { result } = setup();
    const target = document.createElement('input');
    document.body.appendChild(target);
    const textarea = document.createElement('textarea');
    result.current.inputRef.current = textarea;
    const focus = vi.spyOn(textarea, 'focus');

    pressKey('a', {}, target);

    expect(focus).not.toHaveBeenCalled();
    target.remove();
  });
});
