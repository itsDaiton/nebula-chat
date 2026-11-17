import { useQuery } from '@tanstack/react-query';
import { getGetModelUsageSeriesQueryOptions } from '@/libs/api/generated/admin/admin';
import type { UsageParams } from '@/modules/admin/types/types';

export const useUsageSeries = ({ metric, range, audience, models }: UsageParams) =>
  useQuery(getGetModelUsageSeriesQueryOptions({ metric, range, audience, models }));
