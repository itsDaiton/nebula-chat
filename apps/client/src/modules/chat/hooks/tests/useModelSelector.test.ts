import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
