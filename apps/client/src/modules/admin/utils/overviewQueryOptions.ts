import { keepPreviousData } from '@tanstack/react-query';
import { getGetAdminOverviewQueryOptions } from '@/libs/api/generated/admin/admin';
import type { GetAdminOverviewRange } from '@/libs/api/generated/model/getAdminOverviewRange';

// A new range keeps the old tiles on screen until its own arrive.
export const overviewQueryOptions = (range: GetAdminOverviewRange) => ({
  ...getGetAdminOverviewQueryOptions({ range }),
  placeholderData: keepPreviousData,
});
