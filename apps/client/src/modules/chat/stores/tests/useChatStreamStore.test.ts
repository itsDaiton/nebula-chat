import { beforeEach, describe, expect, it } from 'vitest';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { IDLE_REPLY } from '@/modules/chat/utils/replyState';

const store = () => useChatStreamStore.getState();

beforeEach(() => {
  useChatStreamStore.setState({
    history: [],
    reply: IDLE_REPLY,
    usage: null,
    sessionId: undefined,
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

  it('records usage', () => {
    store().setUsage({ promptTokens: 1, completionTokens: 2, totalTokens: 3 });

    expect(store().usage).toEqual({ promptTokens: 1, completionTokens: 2, totalTokens: 3 });
  });

  it('records and clears the session id', () => {
    store().setSessionId('c1');
    expect(store().sessionId).toBe('c1');

    store().setSessionId(undefined);
    expect(store().sessionId).toBeUndefined();
  });
});
