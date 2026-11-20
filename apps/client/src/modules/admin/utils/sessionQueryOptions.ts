import { keepPreviousData } from '@tanstack/react-query';
import { getListAllSessionsQueryOptions } from '@/libs/api/generated/admin/admin';
import type { AdminSessionListItem } from '@/libs/api/generated/model/adminSessionListItem';
import type { AdminSessionListPage } from '@/libs/api/generated/model/adminSessionListPage';
import type { AdminPage, SessionsSearch } from '@/modules/admin/types/types';

const SESSIONS_PAGE_SIZE = 50;

export const DEFAULT_SESSION_ORDER = 'desc';

export const sessionQueryOptions = ({ q, user, model, archived, dir, cursor }: SessionsSearch) => ({
  ...getListAllSessionsQueryOptions({
    limit: SESSIONS_PAGE_SIZE,
    search: q,
    userId: user,
    model,
    archived,
    order: dir ?? DEFAULT_SESSION_ORDER,
    cursor,
  }),
  // A filter, search, sort or page change keeps the old rows on screen until the new ones arrive.
  placeholderData: keepPreviousData,
  select: ({ sessions, nextCursor }: AdminSessionListPage): AdminPage<AdminSessionListItem> => ({
    rows: sessions,
    nextCursor,
  }),
});
