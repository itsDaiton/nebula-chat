import type { GetModelUsageSeriesMetric } from '@/libs/api/generated/model/getModelUsageSeriesMetric';
import type { UsageView } from '@/modules/admin/types/types';

const count = new Intl.NumberFormat('en-US');
const dayFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const longDayFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export const formatCount = (value: number) => count.format(Math.round(value));

export const formatTokens = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return formatCount(value);
};

export const formatSpend = (value: number) =>
  value > 0 && value < 0.01 ? `$${value.toFixed(4)}` : `$${value.toFixed(2)}`;

export const formatPercent = (value: number) => `${value.toFixed(1)}%`;

export const formatSeconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

export const formatMetric = (metric: GetModelUsageSeriesMetric, value: number) => {
  if (metric === 'tokens') return formatTokens(value);
  if (metric === 'spend') return formatSpend(value);
  return formatCount(value);
};

/** A series value as the chart and list show it: raw in Volume, a percent of the day in Share. */
export const formatSeriesValue = (
  metric: GetModelUsageSeriesMetric,
  view: UsageView,
  value: number,
) => (view === 'share' ? formatPercent(value) : formatMetric(metric, value));

export const formatDay = (day: string) => dayFormat.format(new Date(day));

export const formatLongDay = (day: string) => longDayFormat.format(new Date(day));
