import { HttpResponse, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSearchConversationsMockHandler } from '@/libs/api/generated/conversations/conversations.msw';
import { useConversationStore } from '@/modules/conversations/stores/useConversationStore';
import { useConversationsSearchStore } from '@/modules/conversations/stores/useConversationsSearchStore';
import { API_ROUTE } from '@/test/api';
import { server } from '@/test/msw';

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

describe('useConversationsSearchStore', () => {
  it('returns matching conversations', async () => {
    const results = [{ id: 'a', title: 'Hello', createdAt: '2026-01-01T00:00:00.000Z' }];
    server.use(getSearchConversationsMockHandler(results));

    await search().search('hello');

    expect(search().searchResults).toEqual(results);
    expect(search().isSearching).toBe(false);
  });

  it('skips the request entirely for a blank query', async () => {
    let called = false;
    server.use(
      http.get(API_ROUTE.conversationsSearch, () => {
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
      http.get(API_ROUTE.conversationsSearch, ({ request }) => {
        receivedQuery = new URL(request.url).searchParams.get('q');
        return HttpResponse.json([]);
      }),
    );

    await search().search('a & b');

    expect(receivedQuery).toBe('a & b');
  });

  it('records a search failure', async () => {
    server.use(
      http.get(API_ROUTE.conversationsSearch, () =>
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
      http.get(API_ROUTE.conversationsSearch, () => {
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
      http.get(API_ROUTE.conversationsSearch, () => {
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
