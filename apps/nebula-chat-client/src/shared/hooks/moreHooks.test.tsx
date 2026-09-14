import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useKeyboardHandler } from '@/shared/hooks/useKeyboardHandler';
import { useMultiLine } from '@/shared/hooks/useMultiLine';
import { useResetChat } from '@/shared/hooks/useResetChat';
import { useTextareaAutoResize } from '@/shared/hooks/useTextareaAutoResize';
import { useViewportHeight } from '@/shared/hooks/useViewportHeight';
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

describe('useResetChat', () => {
  it('navigates back to the chat root', () => {
    const { result } = renderHook(() => useResetChat());

    act(() => result.current.resetChat());

    expect(navigate).toHaveBeenCalledWith('/');
  });
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

describe('useTextareaAutoResize', () => {
  it('sets an explicit height on mount', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    renderHook(() => useTextareaAutoResize({ current: textarea }));

    expect(textarea.style.height).toMatch(/px$/);
    textarea.remove();
  });

  it('tolerates a null ref', () => {
    expect(() => renderHook(() => useTextareaAutoResize({ current: null } as never))).not.toThrow();
  });

  it('recomputes on input', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    renderHook(() => useTextareaAutoResize({ current: textarea }));

    act(() => {
      textarea.dispatchEvent(new Event('input'));
    });

    expect(textarea.style.height).toMatch(/px$/);
    textarea.remove();
  });
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
