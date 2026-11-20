import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getGetModelUsageTotalsQueryOptions } from '@/libs/api/generated/admin/admin';
import type { UsageTotalsParams } from '@/modules/admin/types/types';

// A new range or audience keeps the old tiles on screen until their own arrive.
export const useUsageTotals = ({ range, audience }: UsageTotalsParams) =>
  useQuery({
    ...getGetModelUsageTotalsQueryOptions({ range, audience }),
    placeholderData: keepPreviousData,
  });
