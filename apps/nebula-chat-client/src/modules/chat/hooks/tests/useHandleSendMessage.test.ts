import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHandleSendMessage } from '@/modules/chat/hooks/useHandleSendMessage';
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
