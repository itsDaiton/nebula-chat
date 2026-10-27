import { act, waitFor } from '@testing-library/react';
import { AppError } from '@nebula-chat/errors';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSearchSessionsMockHandler } from '@/libs/api/generated/sessions/sessions.msw';
import { useSessionsSearch } from '@/modules/sessions/hooks/useSessionsSearch';
import { useSessionsSearchStore } from '@/modules/sessions/stores/useSessionsSearchStore';
import { API_ROUTE, mockApiError } from '@/test/api';
import { server } from '@/test/msw';
import { renderHookWithQueryClient } from '@/test/render';

const aSession = (id: string, title = `Session ${id}`) => ({
  id,
  title,
  createdAt: '2026-06-15T11:55:00.000Z',
  archived: false,
});

beforeEach(() => {
  useSessionsSearchStore.getState().clearSearch();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useSessionsSearch', () => {
  const setup = () => {
    const onClose = vi.fn();
    const onSessionClick = vi.fn();
    const hook = renderHookWithQueryClient(() =>
      useSessionsSearch({
        localSessions: [aSession('local')],
        onClose,
        onSessionClick,
      }),
    );
    return { onClose, onSessionClick, ...hook };
  };

  it('shows the local list until a search settles', () => {
    const { result } = setup();

    expect(result.current.filteredSessions.map((c) => c.id)).toEqual(['local']);
  });

  it('switches to the server results for the query once the debounce settles', async () => {
    let query: string | null = null;
    server.use(
      getSearchSessionsMockHandler(({ request }) => {
        query = new URL(request.url).searchParams.get('q');
        return [aSession('remote')];
      }),
    );
    const { result } = setup();

    act(() => result.current.setSearchQuery('rem'));

    await waitFor(() =>
      expect(result.current.filteredSessions.map((c) => c.id)).toEqual(['remote']),
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
      mockApiError('get', API_ROUTE.sessionsSearch, 400, {
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

  it('selecting a session clears the search and reports the id', () => {
    vi.useFakeTimers();
    const { result, onSessionClick } = setup();
    act(() => result.current.setSearchQuery('hello'));

    act(() => result.current.selectSessionAndClearSearch('picked'));

    expect(onSessionClick).toHaveBeenCalledWith('picked');
    expect(result.current.searchQuery).toBe('');
  });

  it('never sends a search for a query that is only whitespace', async () => {
    // An unhandled request fails the test (see setup.ts), so no handler is registered.
    const { result } = setup();

    act(() => result.current.setSearchQuery('   '));

    await waitFor(() => expect(result.current.isSearching).toBe(false), { timeout: 1000 });
    expect(result.current.filteredSessions.map((c) => c.id)).toEqual(['local']);
  });
});
