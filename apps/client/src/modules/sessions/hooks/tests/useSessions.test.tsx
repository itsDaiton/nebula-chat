import { act, waitFor } from '@testing-library/react';
import { AppError } from '@nebula-chat/errors';
import { describe, expect, it } from 'vitest';
import { getListSessionsMockHandler } from '@/libs/api/generated/sessions/sessions.msw';
import { useSessions } from '@/modules/sessions/hooks/useSessions';
import { paginationConfig } from '@/shared/config/paginationConfig';
import { API_ROUTE, mockApiError } from '@/test/api';
import { server } from '@/test/msw';
import { renderHookWithQueryClient } from '@/test/render';

const FIRST_CURSOR = '22222222-2222-4222-8222-222222222222';

const aSession = (id: string) => ({
  id,
  title: `Session ${id}`,
  createdAt: '2026-06-15T11:55:00.000Z',
  archived: false,
});

describe('useSessions', () => {
  it('reports loading until the first page arrives', () => {
    server.use(getListSessionsMockHandler({ sessions: [], nextCursor: null, hasMore: false }));

    const { result } = renderHookWithQueryClient(() => useSessions());

    expect(result.current.isLoading).toBe(true);
  });

  it('loads the first page at the configured page size', async () => {
    let limit: string | null = null;
    server.use(
      getListSessionsMockHandler(({ request }) => {
        limit = new URL(request.url).searchParams.get('limit');
        return { sessions: [aSession('a')], nextCursor: null, hasMore: false };
      }),
    );

    const { result } = renderHookWithQueryClient(() => useSessions());

    await waitFor(() => expect(result.current.sessions.map((c) => c.id)).toEqual(['a']));
    expect(limit).toBe(String(paginationConfig.defaultLimit));
    expect(result.current.hasMore).toBe(false);
  });

  it('appends the next page, requested by the cursor the last page returned', async () => {
    server.use(
      getListSessionsMockHandler(({ request }) =>
        new URL(request.url).searchParams.get('cursor') === FIRST_CURSOR
          ? { sessions: [aSession('b')], nextCursor: null, hasMore: false }
          : { sessions: [aSession('a')], nextCursor: FIRST_CURSOR, hasMore: true },
      ),
    );
    const { result } = renderHookWithQueryClient(() => useSessions());
    await waitFor(() => expect(result.current.hasMore).toBe(true));

    await act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.sessions.map((c) => c.id)).toEqual(['a', 'b']));
    expect(result.current.hasMore).toBe(false);
  });

  it('surfaces a failure as a typed AppError', async () => {
    server.use(
      mockApiError('get', API_ROUTE.sessions, 401, {
        success: false,
        error: 'Unauthorized',
        message: 'No authenticated session',
      }),
    );

    const { result } = renderHookWithQueryClient(() => useSessions());

    await waitFor(() => expect(result.current.error).toBeInstanceOf(AppError));
    expect(result.current.error?.message).toBe('No authenticated session');
  });
});
