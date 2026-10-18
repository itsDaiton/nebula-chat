import { act, waitFor } from '@testing-library/react';
import { AppError } from '@nebula-chat/errors';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSearchConversationsMockHandler } from '@/libs/api/generated/conversations/conversations.msw';
import { useConversationsSearch } from '@/modules/conversations/hooks/useConversationsSearch';
import { useConversationsSearchStore } from '@/modules/conversations/stores/useConversationsSearchStore';
import { API_ROUTE, mockApiError } from '@/test/api';
import { server } from '@/test/msw';
import { renderHookWithQueryClient } from '@/test/render';

const aConversation = (id: string, title = `Conversation ${id}`) => ({
  id,
  title,
  createdAt: '2026-06-15T11:55:00.000Z',
});

beforeEach(() => {
  useConversationsSearchStore.getState().clearSearch();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useConversationsSearch', () => {
  const setup = () => {
    const onClose = vi.fn();
    const onConversationClick = vi.fn();
    const hook = renderHookWithQueryClient(() =>
      useConversationsSearch({
        localConversations: [aConversation('local')],
        onClose,
        onConversationClick,
      }),
    );
    return { onClose, onConversationClick, ...hook };
  };

  it('shows the local list until a search settles', () => {
    const { result } = setup();

    expect(result.current.filteredConversations.map((c) => c.id)).toEqual(['local']);
  });

  it('switches to the server results for the query once the debounce settles', async () => {
    let query: string | null = null;
    server.use(
      getSearchConversationsMockHandler(({ request }) => {
        query = new URL(request.url).searchParams.get('q');
        return [aConversation('remote')];
      }),
    );
    const { result } = setup();

    act(() => result.current.setSearchQuery('rem'));

    await waitFor(() =>
      expect(result.current.filteredConversations.map((c) => c.id)).toEqual(['remote']),
    );
    expect(query).toBe('rem');
  });

  it('reports searching while the debounce has not caught up', () => {
    vi.useFakeTimers();
    const { result } = setup();

    act(() => result.current.setSearchQuery('typing'));

    // Otherwise the list would flash the unfiltered local set mid-keystroke.
    expect(result.current.isSearching).toBe(true);
  });

  it('surfaces a failed search as a typed AppError', async () => {
    server.use(
      mockApiError('get', API_ROUTE.conversationsSearch, 400, {
        success: false,
        error: 'Validation',
        message: 'Invalid search query',
      }),
    );
    const { result } = setup();

    act(() => result.current.setSearchQuery('bad'));

    await waitFor(() => expect(result.current.error).toBeInstanceOf(AppError));
    expect(result.current.error?.message).toBe('Invalid search query');
  });

  it('closing clears the query and notifies the caller', () => {
    vi.useFakeTimers();
    const { result, onClose } = setup();
    act(() => result.current.setSearchQuery('hello'));

    act(() => result.current.closeAndClearSearch());

    expect(result.current.searchQuery).toBe('');
    expect(onClose).toHaveBeenCalled();
  });

  it('selecting a conversation clears the search and reports the id', () => {
    vi.useFakeTimers();
    const { result, onConversationClick } = setup();
    act(() => result.current.setSearchQuery('hello'));

    act(() => result.current.selectConversationAndClearSearch('picked'));

    expect(onConversationClick).toHaveBeenCalledWith('picked');
    expect(result.current.searchQuery).toBe('');
  });

  it('never sends a search for a query that is only whitespace', async () => {
    // An unhandled request fails the test (see setup.ts), so no handler is registered.
    const { result } = setup();

    act(() => result.current.setSearchQuery('   '));

    await waitFor(() => expect(result.current.isSearching).toBe(false), { timeout: 1000 });
    expect(result.current.filteredConversations.map((c) => c.id)).toEqual(['local']);
  });
});
