import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useConversationsContext } from '@/modules/conversations/context/ConversationsContext';
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
