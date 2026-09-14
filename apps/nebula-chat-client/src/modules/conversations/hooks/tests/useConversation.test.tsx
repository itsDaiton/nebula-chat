import { renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useConversation } from '@/modules/conversations/hooks/useConversation';
import { useConversationStore } from '@/modules/conversations/stores/useConversationStore';
import { API_ROUTE } from '@/test/api';
import { server } from '@/test/msw';

const CONVERSATION_ID = '11111111-1111-4111-8111-111111111111';

/** Captures the observer instances the hook creates. */
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  observe = vi.fn();
  disconnect = vi.fn();
  constructor(
    public callback: IntersectionObserverCallback,
    public options?: IntersectionObserverInit,
  ) {
    FakeIntersectionObserver.instances.push(this);
  }
  trigger(isIntersecting: boolean) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this as never);
  }
}

beforeEach(() => {
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  useConversationStore.setState({
    conversationId: null,
    conversation: null,
    isLoading: false,
    error: null,
  });
});

describe('useConversation', () => {
  it('loads the conversation named in the route', async () => {
    server.use(
      http.get(API_ROUTE.conversation, () =>
        HttpResponse.json({ id: CONVERSATION_ID, title: 'Chat', messages: [] }),
      ),
    );

    const { result } = renderHook(() => useConversation(CONVERSATION_ID));

    await waitFor(() => expect(result.current.conversation).toMatchObject({ id: CONVERSATION_ID }));
  });

  it('clears the loaded conversation when the route has no id', async () => {
    useConversationStore.setState({
      conversationId: CONVERSATION_ID,
      conversation: { id: CONVERSATION_ID, title: 'Chat', messages: [] } as never,
    });

    renderHook(() => useConversation(null));

    await waitFor(() => expect(useConversationStore.getState().conversation).toBeNull());
  });

  it('surfaces a load failure', async () => {
    server.use(
      http.get(API_ROUTE.conversation, () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 }),
      ),
    );

    const { result } = renderHook(() => useConversation(CONVERSATION_ID));

    await waitFor(() => expect(result.current.error).toBe('Not found'));
  });
});
