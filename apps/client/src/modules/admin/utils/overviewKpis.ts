import type { AdminOverview } from '@/libs/api/generated/model/adminOverview';
import type { OverviewDelta, OverviewTileData } from '@/modules/admin/types/types';

const count = new Intl.NumberFormat('en-US');

const direction = (change: number): OverviewDelta['direction'] => {
  if (change > 0) return 'up';
  if (change < 0) return 'down';
  return 'flat';
};

const formatCount = (value: number) => count.format(value);

const formatRate = (rate: number | null) => (rate === null ? '—' : `${(rate * 100).toFixed(1)}%`);

/** The relative change against the previous period; none when that period had nothing to compare. */
const percentDelta = (current: number, previous: number): OverviewDelta | null => {
  if (previous === 0) return null;
  const change = (current - previous) / previous;
  return { direction: direction(change), text: `${Math.abs(change * 100).toFixed(1)}%` };
};

/** A rate's change in percentage points, since a percent of a percent misleads. */
const pointDelta = (current: number | null, previous: number | null): OverviewDelta | null => {
  if (current === null || previous === null) return null;
  const points = Number(((current - previous) * 100).toFixed(1));
  return { direction: direction(points), text: `${Math.abs(points).toFixed(1)} pt` };
};

export const overviewTiles = ({ kpis }: AdminOverview): OverviewTileData[] => {
  const counted = (
    id: 'dailyActiveUsers' | 'weeklyActiveUsers' | 'newRegistrations' | 'messagesSent',
  ) => ({
    id,
    value: formatCount(kpis[id].total),
    delta: percentDelta(kpis[id].total, kpis[id].previousTotal),
    series: kpis[id].series,
  });
  const { guestConversion } = kpis;

  return [
    counted('dailyActiveUsers'),
    counted('weeklyActiveUsers'),
    counted('newRegistrations'),
    {
      id: 'guestConversion',
      value: formatRate(guestConversion.rate),
      delta: pointDelta(guestConversion.rate, guestConversion.previousRate),
      series: guestConversion.series,
    },
    counted('messagesSent'),
  ];
};
