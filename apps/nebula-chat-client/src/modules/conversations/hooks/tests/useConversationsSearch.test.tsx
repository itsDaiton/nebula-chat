import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useConversationsSearch } from '@/modules/conversations/hooks/useConversationsSearch';
import { useConversationsSearchStore } from '@/modules/conversations/stores/useConversationsSearchStore';

const aConversation = (id: string, title = `Conversation ${id}`) => ({
  id,
  title,
  createdAt: '2026-06-15T11:55:00.000Z',
});

beforeEach(() => {
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

describe('useConversationsSearch', () => {
  const setup = () => {
    const onClose = vi.fn();
    const onConversationClick = vi.fn();
    const hook = renderHook(() =>
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

  it('switches to the server results once the query has settled', () => {
    useConversationsSearchStore.setState({
      searchQuery: 'x',
      debouncedQuery: 'x',
      searchResults: [aConversation('remote')],
    });
    const { result } = setup();

    expect(result.current.filteredConversations.map((c) => c.id)).toEqual(['remote']);
  });

  it('reports pending while the debounce has not caught up', () => {
    useConversationsSearchStore.setState({ searchQuery: 'typing', debouncedQuery: '' });
    const { result } = setup();

    // Otherwise the list would flash the unfiltered local set mid-keystroke.
    expect(result.current.isSearching).toBe(true);
  });

  it('closing clears the query and notifies the caller', () => {
    vi.useFakeTimers();
    useConversationsSearchStore.setState({ searchQuery: 'hello' });
    const { result, onClose } = setup();

    act(() => result.current.closeAndClearResults());

    expect(useConversationsSearchStore.getState().searchQuery).toBe('');
    expect(onClose).toHaveBeenCalled();
  });

  it('selecting a conversation clears the search and reports the id', () => {
    vi.useFakeTimers();
    const { result, onConversationClick } = setup();

    act(() => result.current.selectConversationAndClearResults('picked'));

    expect(onConversationClick).toHaveBeenCalledWith('picked');
    expect(useConversationsSearchStore.getState().searchQuery).toBe('');
  });
});
