import { beforeEach, describe, expect, it } from 'vitest';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { useModelStore } from '@/modules/chat/stores/useModelStore';

beforeEach(() => {
  useMessageStore.setState({ message: '' });
  useModelStore.setState({ selectedModel: 'gpt-4o-mini' });
});

describe('useMessageStore', () => {
  it('starts empty', () => {
    expect(useMessageStore.getState().message).toBe('');
  });

  it('accepts a direct value', () => {
    useMessageStore.getState().setMessage('hello');

    expect(useMessageStore.getState().message).toBe('hello');
  });

  it('accepts an updater function, so callers can append without a stale read', () => {
    useMessageStore.getState().setMessage('hello');
    useMessageStore.getState().setMessage((previous) => `${previous} world`);

    expect(useMessageStore.getState().message).toBe('hello world');
  });

  it('can be cleared', () => {
    useMessageStore.getState().setMessage('hello');
    useMessageStore.getState().setMessage('');

    expect(useMessageStore.getState().message).toBe('');
  });
});
