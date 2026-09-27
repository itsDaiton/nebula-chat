import { act, waitFor } from '@testing-library/react';
import { AppError } from '@nebula-chat/errors';
import { describe, expect, it } from 'vitest';
import { getListConversationsMockHandler } from '@/libs/api/generated/conversations/conversations.msw';
import { useConversations } from '@/modules/conversations/hooks/useConversations';
import { paginationConfig } from '@/shared/config/paginationConfig';
import { API_ROUTE, mockApiError } from '@/test/api';
import { server } from '@/test/msw';
import { renderHookWithQueryClient } from '@/test/render';

const FIRST_CURSOR = '22222222-2222-4222-8222-222222222222';

const aConversation = (id: string) => ({
  id,
  title: `Conversation ${id}`,
  createdAt: '2026-06-15T11:55:00.000Z',
});

describe('useConversations', () => {
  it('reports loading until the first page arrives', () => {
    server.use(
      getListConversationsMockHandler({ conversations: [], nextCursor: null, hasMore: false }),
    );

    const { result } = renderHookWithQueryClient(() => useConversations());

    expect(result.current.isLoading).toBe(true);
  });

  it('loads the first page at the configured page size', async () => {
    let limit: string | null = null;
    server.use(
      getListConversationsMockHandler(({ request }) => {
        limit = new URL(request.url).searchParams.get('limit');
        return { conversations: [aConversation('a')], nextCursor: null, hasMore: false };
      }),
    );

    const { result } = renderHookWithQueryClient(() => useConversations());

    await waitFor(() => expect(result.current.conversations.map((c) => c.id)).toEqual(['a']));
    expect(limit).toBe(String(paginationConfig.defaultLimit));
    expect(result.current.hasMore).toBe(false);
  });

  it('appends the next page, requested by the cursor the last page returned', async () => {
    server.use(
      getListConversationsMockHandler(({ request }) =>
        new URL(request.url).searchParams.get('cursor') === FIRST_CURSOR
          ? { conversations: [aConversation('b')], nextCursor: null, hasMore: false }
          : { conversations: [aConversation('a')], nextCursor: FIRST_CURSOR, hasMore: true },
      ),
    );
    const { result } = renderHookWithQueryClient(() => useConversations());
    await waitFor(() => expect(result.current.hasMore).toBe(true));

    await act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.conversations.map((c) => c.id)).toEqual(['a', 'b']));
    expect(result.current.hasMore).toBe(false);
  });

  it('surfaces a failure as a typed AppError', async () => {
    server.use(
      mockApiError('get', API_ROUTE.conversations, 401, {
        success: false,
        error: 'Unauthorized',
        message: 'No authenticated session',
      }),
    );

    const { result } = renderHookWithQueryClient(() => useConversations());

    await waitFor(() => expect(result.current.error).toBeInstanceOf(AppError));
    expect(result.current.error?.message).toBe('No authenticated session');
  });
});
