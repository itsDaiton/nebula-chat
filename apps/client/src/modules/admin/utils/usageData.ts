import type { UsageSeries } from '@/libs/api/generated/model/usageSeries';
import type { UsageSeriesSeriesItem } from '@/libs/api/generated/model/usageSeriesSeriesItem';
import type {
  UsageParams,
  UsageRankRow,
  UsageSearch,
  UsageView,
} from '@/modules/admin/types/types';
import type { ModelOption } from '@/modules/chat/types/types';
import { resources } from '@/resources';
import type { ChartDatum, ChartSeries } from '@/shared/types/types';

const text = resources.admin.usage;

export const resolveUsageSearch = (search: UsageSearch): UsageParams => ({
  metric: search.metric ?? 'prompts',
  range: search.range ?? '30d',
  view: search.view ?? 'volume',
  models: search.models?.length ? search.models : undefined,
  audience: search.audience ?? 'all',
  pinned: search.pinned,
});

export const usageSeriesLabel = (
  item: UsageSeriesSeriesItem,
  getModelLabel: (id: string) => string,
) => {
  if (item.kind === 'run') return text.run;
  if (item.kind === 'other') return text.other(item.members.length);
  return getModelLabel(item.key);
};

/** The Model the chart highlights: the pinned one while it is in the data, else the largest. */
export const highlightedKey = (series: UsageSeries, pinned: string | undefined) => {
  const models = series.series.filter((item) => item.kind === 'model');
  return (models.find((item) => item.key === pinned) ?? models[0])?.key ?? null;
};

// Share rescales each day to 100; a day with nothing stays at zero.
const dayTotals = (series: UsageSeries) =>
  series.days.map((_, i) => series.series.reduce((total, item) => total + item.values[i], 0));

export const displayValue = (value: number, dayTotal: number, view: UsageView) =>
  view === 'share' ? (dayTotal === 0 ? 0 : (value / dayTotal) * 100) : value;

export const toChartSeries = (
  series: UsageSeries,
  getModelLabel: (id: string) => string,
): ChartSeries[] =>
  series.series.map((item) => ({ key: item.key, label: usageSeriesLabel(item, getModelLabel) }));

export const toChartData = (series: UsageSeries, view: UsageView): ChartDatum[] => {
  const totals = dayTotals(series);
  return series.series.flatMap((item) =>
    series.days.map((date, i) => ({
      date,
      seriesKey: item.key,
      value: displayValue(item.values[i], totals[i], view),
    })),
  );
};

export const rankRows = (
  series: UsageSeries,
  index: number,
  view: UsageView,
  options: ModelOption[],
  getModelLabel: (id: string) => string,
): UsageRankRow[] => {
  const total = dayTotals(series)[index] ?? 0;
  const providerOf = (key: string) =>
    options.find((option) => option.value === key)?.provider ?? null;
  const row = (key: string, label: string, kind: UsageRankRow['kind'], value: number) => ({
    key,
    label,
    kind,
    provider: kind === 'model' ? providerOf(key) : null,
    value: displayValue(value, total, view),
    share: total === 0 ? 0 : value / total,
    members: [] as UsageRankRow[],
  });

  return series.series
    .map((item) => ({
      ...row(item.key, usageSeriesLabel(item, getModelLabel), item.kind, item.values[index] ?? 0),
      members: item.members.map((member) =>
        row(member.key, getModelLabel(member.key), 'model', member.values[index] ?? 0),
      ),
    }))
    .sort((a, b) => b.share - a.share);
};
