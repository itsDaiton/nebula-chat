import { act, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationDrawer } from '@/modules/conversations/components/ConversationDrawer';
import { ConversationsSearch } from '@/modules/conversations/components/ConversationsSearch';
import { useConversationsContext } from '@/modules/conversations/context/ConversationsContext';
import { useConversationsSearch } from '@/modules/conversations/hooks/useConversationsSearch';
import { ConversationsProvider } from '@/modules/conversations/providers/ConversationsProvider';
import { useConversationsSearchStore } from '@/modules/conversations/stores/useConversationsSearchStore';
import { useConversationsStore } from '@/modules/conversations/stores/useConversationsStore';
import { renderWithChakra } from '@/test/render';

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

describe('ConversationsSearch', () => {
  const props = {
    conversations: [aConversation('a', 'First chat'), aConversation('b', 'Second chat')],
    onConversationClick: vi.fn(),
    onClose: vi.fn(),
  };

  it('renders a search box', () => {
    renderWithChakra(<ConversationsSearch {...props} />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('lists the local conversations before any query is typed', () => {
    renderWithChakra(<ConversationsSearch {...props} />);

    expect(screen.getByText('First chat')).toBeInTheDocument();
    expect(screen.getByText('Second chat')).toBeInTheDocument();
  });

  it('reports the selected conversation', async () => {
    const onConversationClick = vi.fn();
    renderWithChakra(<ConversationsSearch {...props} onConversationClick={onConversationClick} />);

    await userEvent.click(screen.getByText('First chat'));

    expect(onConversationClick).toHaveBeenCalledWith('a');
  });
});

describe('ConversationDrawer', () => {
  it('renders nothing while closed', () => {
    const { container } = renderWithChakra(
      <ConversationDrawer
        isDrawerOpen={false}
        closeDrawer={vi.fn()}
        toggleSearch={vi.fn()}
        closeSearch={vi.fn()}
      />,
    );

    expect(container.textContent).toBe('');
  });
});

describe('ConversationsProvider', () => {
  const Consumer = () => {
    const { conversations, isLoading } = useConversationsContext();
    return <span>{isLoading ? 'loading' : `${conversations.length} conversations`}</span>;
  };

  it('supplies the store state to consumers', () => {
    useConversationsStore.setState({
      conversations: [aConversation('a')],
      isLoading: false,
    });

    renderWithChakra(
      <ConversationsProvider>
        <Consumer />
      </ConversationsProvider>,
    );

    expect(screen.getByText('1 conversations')).toBeInTheDocument();
  });

  it('throws a named error when the context is used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderWithChakra(<Consumer />)).toThrow(
      /must be used within ConversationsProvider/,
    );
  });
});
