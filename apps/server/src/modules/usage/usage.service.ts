import { usageRepository } from '@server/modules/usage/usage.repository';
import type {
  UsageAgentDetailQuery,
  UsageAudience,
  UsageDetailQuery,
  UsageRange,
  UsageRow,
  UsageRunSeriesQuery,
  UsageSeriesQuery,
  UsageTotals,
  UsageTotalsQuery,
} from '@server/modules/usage/usage.types';

const RUN_OUTCOMES = ['completed', 'partial', 'failed', 'cancelled'] as const;

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
  async getRunSeries({ range, audience }: UsageRunSeriesQuery, now = new Date()) {
    const days = daysOf(range, now);
    const [from, to] = [first(days), last(days)];
    const [runRows, agentRows] = await Promise.all([
      usageRepository.runsByDay(from, to, audience),
      usageRepository.agentCallsByDay(from, to, audience),
    ]);

    const byOutcome = valuesOf(runRows, days);
    const outcomes = RUN_OUTCOMES.map((outcome) => {
      const values = byOutcome.get(outcome) ?? days.map(() => 0);
      return { outcome, total: sum(values), values };
    });

    const spend = valuesOf(
      agentRows.map(({ day, key, spend: value }) => ({ day, key, value })),
      days,
    );
    const tokens = valuesOf(
      agentRows.map(({ day, key, tokens: value }) => ({ day, key, value })),
      days,
    );
    const agents = [...spend]
      .map(([key, spendValues]) => {
        const tokenValues = tokens.get(key) ?? days.map(() => 0);
        return {
          key,
          spendTotal: sum(spendValues),
          tokensTotal: sum(tokenValues),
          spend: spendValues,
          tokens: tokenValues,
        };
      })
      .sort(
        (a, b) =>
          b.spendTotal - a.spendTotal ||
          b.tokensTotal - a.tokensTotal ||
          a.key.localeCompare(b.key),
      );

    return { range, days, outcomes, agents };
  },
  async getAgentDetail({ agent, day, range, audience }: UsageAgentDetailQuery, now = new Date()) {
    const days = daysOf(range, now);
    const [stats, rows] = await Promise.all([
      usageRepository.agentDayStats(agent, day, audience),
      usageRepository.agentTrendByDay(agent, first(days), last(days), audience),
    ]);

    return { agent, day, ...stats, trend: valuesOf(rows, days).get(agent) ?? days.map(() => 0) };
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

    const average = (of: (totals: UsageTotals) => number | null) => ({
      value: of(current),
      previousValue: of(previous),
    });

    return {
      range,
      prompts: pair('prompts'),
      tokens: pair('tokens'),
      spend: pair('spend'),
      activeUsers: pair('activeUsers'),
      runs: pair('runs'),
      runAverages: {
        stepsPerRun: average((t) => ratio(t.runSteps, t.runs)),
        callsPerRun: average((t) => ratio(t.runCalls, t.runs)),
        tokensPerRun: average((t) => ratio(t.runTokens, t.runs)),
        costPerRun: average((t) => ratio(t.runSpend, t.runs)),
        durationMs: average((t) => t.runDurationMs),
      },
      cacheHitRate: {
        rate: ratio(current.cacheReplays, current.calls),
        previousRate: ratio(previous.cacheReplays, previous.calls),
      },
    };
  },
};
