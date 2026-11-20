import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getGetModelUsageSeriesQueryOptions } from '@/libs/api/generated/admin/admin';
import type { UsageParams } from '@/modules/admin/types/types';

// A new metric, range, audience or Model filter keeps the old chart on screen until its own arrives.
export const useUsageSeries = ({ metric, range, audience, models }: UsageParams) =>
  useQuery({
    ...getGetModelUsageSeriesQueryOptions({ metric, range, audience, models }),
    placeholderData: keepPreviousData,
  });
