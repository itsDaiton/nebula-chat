import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useModel } from '@/modules/chat/hooks/useModel';
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
