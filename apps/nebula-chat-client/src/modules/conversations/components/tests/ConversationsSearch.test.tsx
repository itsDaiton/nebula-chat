import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationsSearch } from '@/modules/conversations/components/ConversationsSearch';
import { useConversationsSearchStore } from '@/modules/conversations/stores/useConversationsSearchStore';
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
