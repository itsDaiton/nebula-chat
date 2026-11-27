import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getGetRunUsageSeriesQueryOptions } from '@/libs/api/generated/admin/admin';
import type { UsageTotalsParams } from '@/modules/admin/types/types';

// A new range or audience keeps the old chart on screen until its own arrives.
export const useUsageRunSeries = ({ range, audience }: UsageTotalsParams) =>
  useQuery({
    ...getGetRunUsageSeriesQueryOptions({ range, audience }),
    placeholderData: keepPreviousData,
  });
