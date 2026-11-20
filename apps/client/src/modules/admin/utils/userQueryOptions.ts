import { keepPreviousData } from '@tanstack/react-query';
import { getListUsersQueryOptions } from '@/libs/api/generated/admin/admin';
import type { AdminUserPage } from '@/libs/api/generated/model/adminUserPage';
import type { AdminUserSummary } from '@/libs/api/generated/model/adminUserSummary';
import type { AdminPage, UsersSearch } from '@/modules/admin/types/types';

const USERS_PAGE_SIZE = 50;

export const DEFAULT_USER_SORT = 'lastActiveAt';
export const DEFAULT_USER_ORDER = 'desc';

// `selected` is left out, so opening a User never refetches the table.
export const userQueryOptions = ({ q, status, sort, dir, cursor }: UsersSearch) => ({
  ...getListUsersQueryOptions({
    limit: USERS_PAGE_SIZE,
    search: q,
    // Without a status the API lists every User but Guests.
    status: status?.length ? status : undefined,
    sortBy: sort ?? DEFAULT_USER_SORT,
    order: dir ?? DEFAULT_USER_ORDER,
    cursor,
  }),
  // A filter, search, sort or page change keeps the old rows on screen until the new ones arrive.
  placeholderData: keepPreviousData,
  select: ({ users, nextCursor }: AdminUserPage): AdminPage<AdminUserSummary> => ({
    rows: users,
    nextCursor,
  }),
});
