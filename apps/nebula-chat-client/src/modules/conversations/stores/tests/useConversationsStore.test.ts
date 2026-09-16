import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { getListConversationsMockHandler } from '@/libs/api/generated/conversations/conversations.msw';
import { useConversationsStore } from '@/modules/conversations/stores/useConversationsStore';
import { API_ROUTE } from '@/test/api';
import { server } from '@/test/msw';

const aConversation = (id: string, title = `Conversation ${id}`) => ({
  id,
  title,
  createdAt: '2026-01-01T00:00:00.000Z',
});

const servePage = (
  conversations: ReturnType<typeof aConversation>[],
  nextCursor: string | null = null,
  hasMore = false,
) => {
  server.use(getListConversationsMockHandler({ conversations, nextCursor, hasMore }));
};

const store = () => useConversationsStore.getState();

beforeEach(() => {
  useConversationsStore.setState({
    conversations: [],
    isLoading: true,
    isLoadingMore: false,
    error: null,
    nextCursor: null,
    hasMore: true,
  });
});

describe('fetchConversations', () => {
  it('loads the first page', async () => {
    servePage([aConversation('a'), aConversation('b')], 'cursor-1', true);

    await store().fetchConversations();

    expect(store().conversations.map((c) => c.id)).toEqual(['a', 'b']);
    expect(store().nextCursor).toBe('cursor-1');
    expect(store().hasMore).toBe(true);
  });

  it('clears the loading flag when done', async () => {
    servePage([]);

    await store().fetchConversations();

    expect(store().isLoading).toBe(false);
  });

  it('can refresh without flipping the loading flag, so the list does not blank out', async () => {
    servePage([aConversation('a')]);
    useConversationsStore.setState({ isLoading: false });

    await store().fetchConversations(false);

    expect(store().isLoading).toBe(false);
    expect(store().conversations).toHaveLength(1);
  });

  it('records a server error message', async () => {
    server.use(
      http.get(API_ROUTE.conversations, () =>
        HttpResponse.json({ message: 'Database unavailable' }, { status: 500 }),
      ),
    );

    await store().fetchConversations();

    expect(store().error).toBe('Database unavailable');
  });

  it('clears a previous error on a successful reload', async () => {
    useConversationsStore.setState({ error: 'stale failure' });
    servePage([aConversation('a')]);

    await store().fetchConversations();

    expect(store().error).toBeNull();
  });

  it('still clears the loading flag after a failure', async () => {
    server.use(http.get(API_ROUTE.conversations, () => HttpResponse.json({}, { status: 500 })));

    await store().fetchConversations();

    expect(store().isLoading).toBe(false);
  });
});

describe('loadMore', () => {
  it('appends the next page to the existing list', async () => {
    useConversationsStore.setState({
      conversations: [aConversation('a')],
      nextCursor: 'cursor-1',
      hasMore: true,
      isLoading: false,
    });
    servePage([aConversation('b')], null, false);

    await store().loadMore();

    expect(store().conversations.map((c) => c.id)).toEqual(['a', 'b']);
    expect(store().hasMore).toBe(false);
  });

  it('does nothing when there is no further page', async () => {
    useConversationsStore.setState({ hasMore: false, nextCursor: 'cursor-1' });

    await store().loadMore();

    expect(store().conversations).toEqual([]);
  });

  it('does nothing without a cursor', async () => {
    useConversationsStore.setState({ hasMore: true, nextCursor: null });

    await store().loadMore();

    expect(store().isLoadingMore).toBe(false);
  });

  it('does not start a second page load while one is in flight', async () => {
    useConversationsStore.setState({
      hasMore: true,
      nextCursor: 'cursor-1',
      isLoadingMore: true,
      conversations: [],
    });

    await store().loadMore();

    expect(store().conversations).toEqual([]);
  });

  it('records an error and clears the loading-more flag on failure', async () => {
    useConversationsStore.setState({ hasMore: true, nextCursor: 'cursor-1' });
    server.use(
      http.get(API_ROUTE.conversations, () =>
        HttpResponse.json({ message: 'Gateway timeout' }, { status: 504 }),
      ),
    );

    await store().loadMore();

    expect(store().error).toBe('Gateway timeout');
    expect(store().isLoadingMore).toBe(false);
  });
});

describe('prependConversation', () => {
  it('puts a new conversation at the top', () => {
    useConversationsStore.setState({ conversations: [aConversation('a')] });

    store().prependConversation(aConversation('new'));

    expect(store().conversations.map((c) => c.id)).toEqual(['new', 'a']);
  });

  it('moves an existing conversation to the top rather than duplicating it', () => {
    useConversationsStore.setState({
      conversations: [aConversation('a'), aConversation('b')],
    });

    store().prependConversation(aConversation('b', 'Renamed'));

    expect(store().conversations.map((c) => c.id)).toEqual(['b', 'a']);
    expect(store().conversations[0]?.title).toBe('Renamed');
  });
});

describe('refetch', () => {
  it('reloads without the loading flag and cancels any in-flight page load', async () => {
    useConversationsStore.setState({ isLoadingMore: true, isLoading: false });
    servePage([aConversation('a')]);

    await store().refetch();

    expect(store().isLoadingMore).toBe(false);
    expect(store().isLoading).toBe(false);
    expect(store().conversations).toHaveLength(1);
  });
});
