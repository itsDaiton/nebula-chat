import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useConversationsSearchStore } from '@/modules/conversations/stores/useConversationsSearchStore';

const store = () => useConversationsSearchStore.getState();

beforeEach(() => {
  vi.useFakeTimers();
  store().clearSearch();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useConversationsSearchStore', () => {
  it('shows the typed text at once but settles the query only after a pause', () => {
    store().setSearchQuery('hel');

    expect(store().searchQuery).toBe('hel');
    expect(store().debouncedQuery).toBe('');

    vi.advanceTimersByTime(300);

    expect(store().debouncedQuery).toBe('hel');
  });

  it('settles only the last of several quick keystrokes', () => {
    store().setSearchQuery('h');
    vi.advanceTimersByTime(100);
    store().setSearchQuery('he');
    vi.advanceTimersByTime(100);
    store().setSearchQuery('hey');

    vi.advanceTimersByTime(299);
    expect(store().debouncedQuery).toBe('');

    vi.advanceTimersByTime(1);
    expect(store().debouncedQuery).toBe('hey');
  });

  it('clearing cancels a pending settle', () => {
    store().setSearchQuery('abandoned');

    store().clearSearch();
    vi.advanceTimersByTime(300);

    expect(store().searchQuery).toBe('');
    expect(store().debouncedQuery).toBe('');
  });
});
