import { keepPreviousData } from '@tanstack/react-query';
import { getListAllRunsQueryOptions } from '@/libs/api/generated/admin/admin';
import type { AdminRunListItem } from '@/libs/api/generated/model/adminRunListItem';
import type { AdminRunListPage } from '@/libs/api/generated/model/adminRunListPage';
import type { AdminPage, RunsSearch } from '@/modules/admin/types/types';
import { startOfDay, startOfNextDay } from '@/modules/admin/utils/auditQueryOptions';

const RUNS_PAGE_SIZE = 50;

export const DEFAULT_RUN_SORT = 'startedAt';
export const DEFAULT_RUN_ORDER = 'desc';

// `selected` is left out, so opening a Run never refetches the table.
export const runQueryOptions = ({ status, user, from, to, sort, dir, cursor }: RunsSearch) => ({
  ...getListAllRunsQueryOptions({
    limit: RUNS_PAGE_SIZE,
    status: status?.length ? status : undefined,
    userId: user,
    from: from ? startOfDay(from) : undefined,
    // `to` is exclusive on the API, so the last chosen day is included.
    to: to ? startOfNextDay(to) : undefined,
    sortBy: sort ?? DEFAULT_RUN_SORT,
    order: dir ?? DEFAULT_RUN_ORDER,
    cursor,
  }),
  // A filter, sort or page change keeps the old rows on screen until the new ones arrive.
  placeholderData: keepPreviousData,
  select: ({ runs, nextCursor }: AdminRunListPage): AdminPage<AdminRunListItem> => ({
    rows: runs,
    nextCursor,
  }),
});
