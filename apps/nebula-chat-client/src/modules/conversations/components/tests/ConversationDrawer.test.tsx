import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationDrawer } from '@/modules/conversations/components/ConversationDrawer';
import { useConversationsSearchStore } from '@/modules/conversations/stores/useConversationsSearchStore';
import { renderWithChakra } from '@/test/render';

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
