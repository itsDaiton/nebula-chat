import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessageHandler } from '@/modules/chat/hooks/useMessageHandler';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { useModelSelectorStore } from '@/modules/chat/stores/useModelSelectorStore';
import { useModelStore } from '@/modules/chat/stores/useModelStore';

beforeEach(() => {
  vi.clearAllMocks();
  useMessageStore.setState({ message: '' });
  useModelStore.setState({ selectedModel: 'gpt-4o-mini' });
  useModelSelectorStore.setState({ isSelectOpen: false, triggerWidth: 120 });
  useChatStreamStore.setState({ history: [] });
});

describe('useMessageHandler', () => {
  it('sends the current message and clears the box', () => {
    const onSendMessage = vi.fn();
    useMessageStore.setState({ message: 'hello' });
    const { result } = renderHook(() => useMessageHandler({ onSendMessage, isLoading: false }));

    act(() => result.current.handleMessageSend());

    expect(onSendMessage).toHaveBeenCalledWith('hello');
    expect(useMessageStore.getState().message).toBe('');
  });

  it('ignores a whitespace-only message', () => {
    const onSendMessage = vi.fn();
    useMessageStore.setState({ message: '   ' });
    const { result } = renderHook(() => useMessageHandler({ onSendMessage, isLoading: false }));

    act(() => result.current.handleMessageSend());

    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('ignores an empty message', () => {
    const onSendMessage = vi.fn();
    const { result } = renderHook(() => useMessageHandler({ onSendMessage, isLoading: false }));

    act(() => result.current.handleMessageSend());

    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('submits on form submit and suppresses the browser navigation', () => {
    const onSendMessage = vi.fn();
    useMessageStore.setState({ message: 'hello' });
    const { result } = renderHook(() => useMessageHandler({ onSendMessage, isLoading: false }));
    const preventDefault = vi.fn();

    act(() => {
      result.current.handleSubmit({
        preventDefault,
      } as unknown as Parameters<typeof result.current.handleSubmit>[0]);
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(onSendMessage).toHaveBeenCalledWith('hello');
  });

  it('does not send while a response is still loading', () => {
    const onSendMessage = vi.fn();
    useMessageStore.setState({ message: 'hello' });
    const { result } = renderHook(() => useMessageHandler({ onSendMessage, isLoading: true }));

    act(() => {
      result.current.handleSubmit({
        preventDefault: vi.fn(),
      } as unknown as Parameters<typeof result.current.handleSubmit>[0]);
    });

    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('resets the textarea height after sending', () => {
    const textarea = document.createElement('textarea');
    textarea.style.height = '120px';
    document.body.appendChild(textarea);
    useMessageStore.setState({ message: 'hello' });
    const { result } = renderHook(() =>
      useMessageHandler({ onSendMessage: vi.fn(), isLoading: false }),
    );

    act(() => result.current.handleMessageSend());

    expect(textarea.style.height).toBe('auto');
    textarea.remove();
  });
});
