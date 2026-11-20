import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getGetModelUsageTotalsQueryOptions } from '@/libs/api/generated/admin/admin';
import type { UsageParams } from '@/modules/admin/types/types';

// A new range or audience keeps the old tiles on screen until their own arrive.
export const useUsageTotals = ({ range, audience }: Pick<UsageParams, 'range' | 'audience'>) =>
  useQuery({
    ...getGetModelUsageTotalsQueryOptions({ range, audience }),
    placeholderData: keepPreviousData,
  });
