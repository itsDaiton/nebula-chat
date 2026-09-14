import { HttpResponse, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useConversationStore } from '@/modules/conversations/stores/useConversationStore';
import { useConversationsSearchStore } from '@/modules/conversations/stores/useConversationsSearchStore';
import { server } from '@/test/msw';

const BASE = 'http://localhost:3000/api/conversations';
const CONVERSATION_ID = '11111111-1111-4111-8111-111111111111';

const conversation = () => useConversationStore.getState();
const search = () => useConversationsSearchStore.getState();

beforeEach(() => {
  useConversationStore.setState({
    conversationId: null,
    conversation: null,
    isLoading: false,
    error: null,
  });
  useConversationsSearchStore.setState({
    searchQuery: '',
    debouncedQuery: '',
    searchResults: [],
    isSearching: false,
    error: null,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useConversationStore', () => {
  it('loads a conversation with its messages', async () => {
    const payload = { id: CONVERSATION_ID, title: 'Chat', messages: [] };
    server.use(http.get(`${BASE}/:id`, () => HttpResponse.json(payload)));

    await conversation().fetchConversation(CONVERSATION_ID);

    expect(conversation().conversation).toEqual(payload);
    expect(conversation().conversationId).toBe(CONVERSATION_ID);
    expect(conversation().isLoading).toBe(false);
  });

  it('records a 404 as an error and drops any stale conversation', async () => {
    useConversationStore.setState({
      conversation: { id: 'old', title: 'Old', messages: [] } as never,
    });
    server.use(
      http.get(`${BASE}/:id`, () =>
        HttpResponse.json({ message: 'Conversation not found' }, { status: 404 }),
      ),
    );

    await conversation().fetchConversation(CONVERSATION_ID);

    expect(conversation().error).toBe('Conversation not found');
    expect(conversation().conversation).toBeNull();
  });

  it('ignores a duplicate request for the conversation already loading', async () => {
    useConversationStore.setState({ conversationId: CONVERSATION_ID, isLoading: true });

    await conversation().fetchConversation(CONVERSATION_ID);

    // Still loading: the call returned early rather than starting a second fetch.
    expect(conversation().isLoading).toBe(true);
  });

  it('refetches the current conversation', async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE}/:id`, () => {
        calls += 1;
        return HttpResponse.json({ id: CONVERSATION_ID, title: 'Chat', messages: [] });
      }),
    );
    await conversation().fetchConversation(CONVERSATION_ID);

    await conversation().refetch();

    expect(calls).toBe(2);
  });

  it('refetch is a no-op when nothing is loaded', async () => {
    await expect(conversation().refetch()).resolves.toBeUndefined();
    expect(conversation().conversationId).toBeNull();
  });

  it('clear resets the loaded conversation and error', () => {
    useConversationStore.setState({
      conversationId: CONVERSATION_ID,
      conversation: { id: CONVERSATION_ID } as never,
      error: 'boom',
    });

    conversation().clear();

    expect(conversation()).toMatchObject({
      conversationId: null,
      conversation: null,
      error: null,
    });
  });
});

describe('useConversationsSearchStore', () => {
  it('returns matching conversations', async () => {
    const results = [{ id: 'a', title: 'Hello', createdAt: '2026-01-01T00:00:00.000Z' }];
    server.use(http.get(`${BASE}/search`, () => HttpResponse.json(results)));

    await search().search('hello');

    expect(search().searchResults).toEqual(results);
    expect(search().isSearching).toBe(false);
  });

  it('skips the request entirely for a blank query', async () => {
    let called = false;
    server.use(
      http.get(`${BASE}/search`, () => {
        called = true;
        return HttpResponse.json([]);
      }),
    );

    await search().search('   ');

    expect(called).toBe(false);
    expect(search().searchResults).toEqual([]);
  });

  it('url-encodes the query', async () => {
    let receivedQuery: string | null = null;
    server.use(
      http.get(`${BASE}/search`, ({ request }) => {
        receivedQuery = new URL(request.url).searchParams.get('q');
        return HttpResponse.json([]);
      }),
    );

    await search().search('a & b');

    expect(receivedQuery).toBe('a & b');
  });

  it('records a search failure', async () => {
    server.use(
      http.get(`${BASE}/search`, () =>
        HttpResponse.json({ message: 'Search index down' }, { status: 500 }),
      ),
    );

    await search().search('hello');

    expect(search().error).toBe('Search index down');
    expect(search().isSearching).toBe(false);
  });

  it('debounces typing into a single search after 300ms', async () => {
    vi.useFakeTimers();
    let calls = 0;
    server.use(
      http.get(`${BASE}/search`, () => {
        calls += 1;
        return HttpResponse.json([]);
      }),
    );

    search().setSearchQuery('h');
    search().setSearchQuery('he');
    search().setSearchQuery('hel');

    expect(calls).toBe(0);
    await vi.advanceTimersByTimeAsync(300);

    expect(search().debouncedQuery).toBe('hel');
    expect(calls).toBe(1);
  });

  it('updates the visible query immediately, before the debounce fires', () => {
    vi.useFakeTimers();

    search().setSearchQuery('hel');

    expect(search().searchQuery).toBe('hel');
    expect(search().debouncedQuery).toBe('');
  });

  it('clearResults cancels a pending debounce so no stale search lands', async () => {
    vi.useFakeTimers();
    let calls = 0;
    server.use(
      http.get(`${BASE}/search`, () => {
        calls += 1;
        return HttpResponse.json([]);
      }),
    );
    search().setSearchQuery('hello');

    search().clearResults();
    await vi.advanceTimersByTimeAsync(300);

    expect(calls).toBe(0);
    expect(search().searchQuery).toBe('');
    expect(search().searchResults).toEqual([]);
  });
});
