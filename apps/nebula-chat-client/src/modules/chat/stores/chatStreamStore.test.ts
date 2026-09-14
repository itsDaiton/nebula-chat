import { beforeEach, describe, expect, it } from 'vitest';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';

const store = () => useChatStreamStore.getState();

beforeEach(() => {
  useChatStreamStore.setState({
    history: [],
    isStreaming: false,
    isPostStreamNavigation: false,
    error: null,
    usage: null,
    conversationId: undefined,
  });
});

describe('useChatStreamStore', () => {
  it('accepts a direct history value', () => {
    store().setHistory([{ id: 'm1', role: 'user', content: 'hi' }]);

    expect(store().history).toHaveLength(1);
  });

  it('accepts an updater, so a token can append without a stale read', () => {
    store().setHistory([{ id: 'm1', role: 'assistant', content: 'He' }]);

    store().setHistory((previous) => previous.map((m) => ({ ...m, content: `${m.content}llo` })));

    expect(store().history[0]?.content).toBe('Hello');
  });

  it('tracks the streaming and post-stream flags independently', () => {
    store().setIsStreaming(true);
    store().setIsPostStreamNavigation(true);

    expect(store().isStreaming).toBe(true);
    expect(store().isPostStreamNavigation).toBe(true);
  });

  it('records and clears an error', () => {
    store().setError('boom');
    expect(store().error).toBe('boom');

    store().setError(null);
    expect(store().error).toBeNull();
  });

  it('records usage', () => {
    store().setUsage({ promptTokens: 1, completionTokens: 2, totalTokens: 3 });

    expect(store().usage).toEqual({ promptTokens: 1, completionTokens: 2, totalTokens: 3 });
  });

  it('records and clears the conversation id', () => {
    store().setConversationId('c1');
    expect(store().conversationId).toBe('c1');

    store().setConversationId(undefined);
    expect(store().conversationId).toBeUndefined();
  });
});
