import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHandleSendMessage } from '@/modules/chat/hooks/useHandleSendMessage';
import { useMessageHandler } from '@/modules/chat/hooks/useMessageHandler';
import { useModel } from '@/modules/chat/hooks/useModel';
import { useModelSelector } from '@/modules/chat/hooks/useModelSelector';
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

describe('useModel', () => {
  it('exposes the selected model and its setter', () => {
    const { result } = renderHook(() => useModel());

    expect(result.current.selectedModel).toBe('gpt-4o-mini');

    act(() => result.current.setSelectedModel('gpt-4o'));

    expect(result.current.selectedModel).toBe('gpt-4o');
  });
});

describe('useModelSelector', () => {
  it('widens the trigger to fit a longer model label', () => {
    const { result: short } = renderHook(() => useModelSelector({ selectedModel: 'gpt-4o' }));
    const narrow = short.current.triggerWidth;

    const { result: long } = renderHook(() => useModelSelector({ selectedModel: 'gpt-4.1-mini' }));

    expect(long.current.triggerWidth).toBeGreaterThanOrEqual(narrow);
  });

  it('never goes below the minimum width', () => {
    const { result } = renderHook(() => useModelSelector({ selectedModel: 'gpt-4o' }));

    expect(result.current.triggerWidth).toBeGreaterThanOrEqual(120);
  });

  it('falls back to the minimum for a model with no registered label', () => {
    const { result } = renderHook(() => useModelSelector({ selectedModel: 'unknown-model' }));

    expect(result.current.triggerWidth).toBe(120);
  });

  it('exposes the open state and its setter', () => {
    const { result } = renderHook(() => useModelSelector({ selectedModel: 'gpt-4o' }));

    act(() => result.current.setIsSelectOpen(true));

    expect(useModelSelectorStore.getState().isSelectOpen).toBe(true);
  });
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

describe('useHandleSendMessage', () => {
  it('appends the new user message to the existing history', async () => {
    const streamMessage = vi.fn().mockResolvedValue(undefined);
    const history = [{ id: 'm1', role: 'user' as const, content: 'earlier' }];
    const { result } = renderHook(() => useHandleSendMessage({ history, streamMessage }));

    await act(async () => {
      await result.current.handleSendMessage('newest', 'gpt-4o');
    });

    const call = streamMessage.mock.calls[0][0];
    expect(call.messages).toHaveLength(2);
    expect(call.messages.at(-1)).toMatchObject({ role: 'user', content: 'newest' });
    expect(call.model).toBe('gpt-4o');
  });

  it('gives each new message its own id', async () => {
    const streamMessage = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useHandleSendMessage({ history: [], streamMessage }));

    await act(async () => {
      await result.current.handleSendMessage('one', 'gpt-4o');
      await result.current.handleSendMessage('two', 'gpt-4o');
    });

    const firstId = streamMessage.mock.calls[0][0].messages[0].id;
    const secondId = streamMessage.mock.calls[1][0].messages[0].id;
    expect(firstId).not.toBe(secondId);
  });

  it('swallows a streaming failure rather than surfacing it to the caller', async () => {
    const streamMessage = vi.fn().mockRejectedValue(new Error('network down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useHandleSendMessage({ history: [], streamMessage }));

    await expect(
      act(async () => {
        await result.current.handleSendMessage('hello', 'gpt-4o');
      }),
    ).resolves.toBeUndefined();
  });
});
