import type { UsageTotals } from '@/libs/api/generated/model/usageTotals';
import type { OverviewDelta, UsageTileData } from '@/modules/admin/types/types';
import {
  formatCount,
  formatPercent,
  formatSpend,
  formatTokens,
} from '@/modules/admin/utils/usageFormat';

const direction = (change: number): OverviewDelta['direction'] => {
  if (change > 0) return 'up';
  if (change < 0) return 'down';
  return 'flat';
};

/** The relative change against the previous period; none when that period had nothing to compare. */
const percentDelta = (current: number, previous: number): OverviewDelta | null => {
  if (previous === 0) return null;
  const change = (current - previous) / previous;
  return { direction: direction(change), text: `${Math.abs(change * 100).toFixed(1)}%` };
};

const pointDelta = (current: number | null, previous: number | null): OverviewDelta | null => {
  if (current === null || previous === null) return null;
  const points = Number(((current - previous) * 100).toFixed(1));
  return { direction: direction(points), text: `${Math.abs(points).toFixed(1)} pt` };
};

export const usageTiles = (totals: UsageTotals): UsageTileData[] => {
  const counted = (
    id: 'prompts' | 'tokens' | 'spend' | 'activeUsers' | 'runs',
    format: (value: number) => string,
  ): UsageTileData => ({
    id,
    value: format(totals[id].total),
    delta: percentDelta(totals[id].total, totals[id].previousTotal),
  });
  const { rate, previousRate } = totals.cacheHitRate;

  return [
    counted('prompts', formatCount),
    counted('tokens', formatTokens),
    counted('spend', formatSpend),
    counted('activeUsers', formatCount),
    counted('runs', formatCount),
    {
      id: 'cacheHitRate',
      value: rate === null ? '—' : formatPercent(rate * 100),
      delta: pointDelta(rate, previousRate),
    },
  ];
};
