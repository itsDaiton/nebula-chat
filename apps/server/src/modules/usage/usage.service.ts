import { usageRepository } from '@server/modules/usage/usage.repository';
import type {
  UsageAudience,
  UsageDetailQuery,
  UsageRange,
  UsageRow,
  UsageSeriesQuery,
  UsageTotalsQuery,
} from '@server/modules/usage/usage.types';

const DAY_MS = 86_400_000;
const TOP_MODELS = 8;

const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const first = (days: string[]) => days[0] ?? '';

const last = (days: string[]) => days.at(-1) ?? '';

const ratio = (part: number, whole: number) => (whole === 0 ? null : part / whole);

// The `length` UTC days ending `offset` days before today, oldest first.
const daysOf = (range: UsageRange, now: Date, offset = 0) => {
  const length = Number.parseInt(range, 10);
  const today = Math.floor(now.getTime() / DAY_MS) * DAY_MS;
  return Array.from({ length }, (_, i) => dayOf(today - (offset + length - 1 - i) * DAY_MS));
};

const seriesRows = (
  metric: UsageSeriesQuery['metric'],
  days: string[],
  audience: UsageAudience,
  models?: string[],
): Promise<UsageRow[]> => {
  const [from, to] = [first(days), last(days)];
  return metric === 'prompts'
    ? usageRepository.promptsByDay(from, to, audience, models)
    : usageRepository.callsByDay(metric, from, to, audience, models);
};

const valuesOf = (rows: UsageRow[], days: string[]) => {
  const byKey = new Map<string, Map<string, number>>();
  for (const { day, key, value } of rows) {
    const perDay = byKey.get(key) ?? new Map<string, number>();
    perDay.set(day, (perDay.get(day) ?? 0) + value);
    byKey.set(key, perDay);
  }
  return new Map(
    [...byKey].map(([key, perDay]) => [key, days.map((day) => perDay.get(day) ?? 0)] as const),
  );
};

export const usageService = {
  async getSeries({ metric, range, audience, models }: UsageSeriesQuery, now = new Date()) {
    const days = daysOf(range, now);
    const byKey = valuesOf(await seriesRows(metric, days, audience, models), days);

    const entries = [...byKey].map(([key, values]) => ({ key, values, total: sum(values) }));
    const ranked = entries
      .filter(({ key }) => key !== 'run')
      .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
    const kept = ranked.slice(0, TOP_MODELS);
    const rest = ranked.slice(TOP_MODELS);

    const run = entries.find(({ key }) => key === 'run');
    const series = [
      ...(run ? [{ ...run, kind: 'run' as const, members: [] }] : []),
      ...kept.map((entry) => ({ ...entry, kind: 'model' as const, members: [] })),
      ...(rest.length > 0
        ? [
            {
              key: 'other',
              kind: 'other' as const,
              values: days.map((_, i) => sum(rest.map((entry) => entry.values[i] ?? 0))),
              total: sum(rest.map((entry) => entry.total)),
              members: rest,
            },
          ]
        : []),
    ].sort((a, b) => b.total - a.total);

    return { metric, range, days, series };
  },
  async getDetail({ model, day, range, audience }: UsageDetailQuery, now = new Date()) {
    const days = daysOf(range, now);
    const [stats, rows] = await Promise.all([
      usageRepository.dayStats(model, day, audience),
      seriesRows('prompts', days, audience, [model]),
    ]);
    const trend = valuesOf(rows, days).get(model) ?? days.map(() => 0);
    const index = days.indexOf(day);

    return {
      model,
      day,
      prompts: index === -1 ? 0 : trend[index],
      ...stats,
      trend,
    };
  },
  async getTotals({ range, audience }: UsageTotalsQuery, now = new Date()) {
    const days = daysOf(range, now);
    const previousDays = daysOf(range, now, days.length);
    const [current, previous] = await Promise.all([
      usageRepository.totals(first(days), last(days), audience),
      usageRepository.totals(first(previousDays), last(previousDays), audience),
    ]);
    const pair = (key: 'prompts' | 'tokens' | 'spend' | 'activeUsers' | 'runs') => ({
      total: current[key],
      previousTotal: previous[key],
    });

    return {
      range,
      prompts: pair('prompts'),
      tokens: pair('tokens'),
      spend: pair('spend'),
      activeUsers: pair('activeUsers'),
      runs: pair('runs'),
      cacheHitRate: {
        rate: ratio(current.cacheReplays, current.calls),
        previousRate: ratio(previous.cacheReplays, previous.calls),
      },
    };
  },
};
