import { beforeEach, describe, expect, it } from 'vitest';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { useModelStore } from '@/modules/chat/stores/useModelStore';

beforeEach(() => {
  useMessageStore.setState({ message: '' });
  useModelStore.setState({ selectedModel: 'gpt-4o-mini' });
});

describe('useModelStore', () => {
  it('defaults to gpt-4o-mini', () => {
    expect(useModelStore.getState().selectedModel).toBe('gpt-4o-mini');
  });

  it('accepts a direct value', () => {
    useModelStore.getState().setSelectedModel('gpt-4o');

    expect(useModelStore.getState().selectedModel).toBe('gpt-4o');
  });

  it('accepts an updater function', () => {
    useModelStore.getState().setSelectedModel((previous) => `${previous}-turbo`);

    expect(useModelStore.getState().selectedModel).toBe('gpt-4o-mini-turbo');
  });
});
