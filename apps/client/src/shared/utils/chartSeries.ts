import type { ChartDatum, ChartSeries } from '@/shared/types/types';

// Muted steps are a share of the foreground over the panel, so one list serves light and dark.
const MUTED_STEPS = [58, 44, 33, 24, 17, 12, 8];

export const ACTIVE_PAINT = 'var(--foreground)';

export const mutedPaint = (step: number): string => {
  const share = MUTED_STEPS[Math.min(step, MUTED_STEPS.length - 1)];
  return `color-mix(in oklab, var(--foreground) ${share}%, var(--panel))`;
};

// One paint per series in stack order; the active one takes the foreground, the rest distinct greys.
export const seriesPaints = (
  series: readonly ChartSeries[],
  activeSeries: string | null,
): string[] => {
  let step = 0;
  return series.map((s) => (s.key === activeSeries ? ACTIVE_PAINT : mutedPaint(step++)));
};

export const sortedDates = (data: readonly ChartDatum[]): string[] =>
  [...new Set(data.map((d) => d.date))].sort((a, b) => a.localeCompare(b));

export const toDateKey = (date: Date): string => date.toISOString().slice(0, 10);

export const dateIndexOf = (dates: readonly string[], date: Date | null): number | null => {
  if (!date) return null;
  const index = dates.indexOf(toDateKey(date));
  return index === -1 ? null : index;
};
