import { describe, expect, it } from 'vitest';
import type { UsageSeries } from '@/libs/api/generated/model/usageSeries';
import type { UsageRunSeries } from '@/libs/api/generated/model/usageRunSeries';
import {
  hasRuns,
  highlightedAgent,
  highlightedKey,
  rankAgentRows,
  rankRows,
  resolveUsageSearch,
  toChartData,
  toRunChartData,
  toRunChartSeries,
} from '@/modules/admin/utils/usageData';
import type { ModelOption } from '@/modules/chat/types/types';

const series: UsageSeries = {
  metric: 'prompts',
  range: '7d',
  days: ['2026-10-01', '2026-10-02'],
  series: [
    { key: 'run', kind: 'run', total: 4, values: [1, 3], members: [] },
    { key: 'gpt-4o', kind: 'model', total: 6, values: [3, 3], members: [] },
    {
      key: 'other',
      kind: 'other',
      total: 2,
      values: [0, 2],
      members: [{ key: 'gpt-5', total: 2, values: [0, 2] }],
    },
  ],
};

const options: ModelOption[] = [
  { value: 'gpt-4o', label: 'GPT-4o', provider: 'openai', contextWindow: 1, maxOutput: 1 },
];
const label = (id: string) => (id === 'gpt-4o' ? 'GPT-4o' : id);

describe('resolveUsageSearch', () => {
  it('falls back to 30 days of Prompts as a volume for everyone', () => {
    expect(resolveUsageSearch({})).toEqual({
      metric: 'prompts',
      range: '30d',
      view: 'volume',
      models: undefined,
      audience: 'all',
      pinned: undefined,
    });
  });

  it('treats an empty Model filter as none', () => {
    expect(resolveUsageSearch({ models: [] }).models).toBeUndefined();
  });
});

describe('highlightedKey', () => {
  it('is the pinned Model, else the largest Model, never the Run series', () => {
    expect(highlightedKey(series, 'gpt-4o')).toBe('gpt-4o');
    expect(highlightedKey(series, 'gone')).toBe('gpt-4o');
    expect(highlightedKey(series, 'gpt-5')).toBe('gpt-5');
    expect(highlightedKey({ ...series, series: [series.series[0]] }, undefined)).toBeNull();
  });
});

describe('toChartData', () => {
  it('keeps the raw values in Volume', () => {
    expect(toChartData(series, 'volume').filter((d) => d.date === '2026-10-02')).toEqual([
      { date: '2026-10-02', seriesKey: 'run', value: 3 },
      { date: '2026-10-02', seriesKey: 'gpt-4o', value: 3 },
      { date: '2026-10-02', seriesKey: 'other', value: 2 },
    ]);
  });

  it('rescales every day to 100 in Share, and leaves an empty day at zero', () => {
    const data = toChartData(series, 'share');
    const sum = (date: string) =>
      data.filter((d) => d.date === date).reduce((total, d) => total + d.value, 0);

    expect(sum('2026-10-01')).toBeCloseTo(100);
    expect(sum('2026-10-02')).toBeCloseTo(100);

    const empty = toChartData(
      { ...series, series: [{ ...series.series[1], values: [0, 0] }] },
      'share',
    );
    expect(empty.every((d) => d.value === 0)).toBe(true);
  });
});

describe('rankRows', () => {
  it('ranks a day by share with provider, label and the Other members', () => {
    const rows = rankRows(series, 1, 'volume', options, label);

    expect(rows.map((row) => [row.key, row.value, Math.round(row.share * 100)])).toEqual([
      ['run', 3, 38],
      ['gpt-4o', 3, 38],
      ['other', 2, 25],
    ]);
    expect(rows.find((row) => row.key === 'gpt-4o')).toMatchObject({
      label: 'GPT-4o',
      provider: 'openai',
    });
    expect(rows.find((row) => row.key === 'other')?.members).toMatchObject([
      { key: 'gpt-5', value: 2, provider: null },
    ]);
  });

  it('gives a share of zero to every row on an empty day', () => {
    const rows = rankRows(series, 5, 'share', options, label);

    expect(rows.every((row) => row.share === 0 && row.value === 0)).toBe(true);
  });
});

const runSeries = (overrides: Partial<UsageRunSeries> = {}): UsageRunSeries => ({
  range: '7d',
  days: ['2026-10-01', '2026-10-02'],
  outcomes: [
    { outcome: 'completed', total: 3, values: [1, 2] },
    { outcome: 'partial', total: 0, values: [0, 0] },
    { outcome: 'failed', total: 1, values: [0, 1] },
    { outcome: 'cancelled', total: 0, values: [0, 0] },
  ],
  agents: [
    { key: 'orchestrator', spendTotal: 0.6, tokensTotal: 60, spend: [0.2, 0.4], tokens: [20, 40] },
    { key: 'writer', spendTotal: 0.2, tokensTotal: 20, spend: [0.2, 0], tokens: [20, 0] },
  ],
  ...overrides,
});

describe('Runs tab data', () => {
  it('reads the Runs metric from the URL', () => {
    expect(resolveUsageSearch({ metric: 'runs' }).metric).toBe('runs');
  });

  it('charts one series per outcome, in status colours for the ones that went wrong', () => {
    const chart = toRunChartSeries(runSeries());

    expect(chart.map(({ key }) => key)).toEqual(['completed', 'partial', 'failed', 'cancelled']);
    expect(chart[1].paint).toBe('var(--warning)');
    expect(chart[2].paint).toBe('var(--destructive)');
    expect(toRunChartData(runSeries())).toHaveLength(8);
    expect(
      toRunChartData(runSeries()).find((d) => d.seriesKey === 'failed' && d.date === '2026-10-02'),
    ).toMatchObject({ value: 1 });
  });

  it('has no Runs only when nothing ended and no Agent spent', () => {
    expect(hasRuns(runSeries())).toBe(true);
    expect(
      hasRuns(
        runSeries({
          agents: [],
          outcomes: runSeries().outcomes.map((o) => ({ ...o, total: 0, values: [0, 0] })),
        }),
      ),
    ).toBe(false);
  });

  it('highlights the pinned Agent, else the costliest', () => {
    expect(highlightedAgent(runSeries(), 'writer')).toBe('writer');
    expect(highlightedAgent(runSeries(), 'gone')).toBe('orchestrator');
    expect(highlightedAgent(runSeries({ agents: [] }), undefined)).toBeNull();
  });

  it('ranks Agents by their share of the day’s spend', () => {
    const rows = rankAgentRows(runSeries(), 0);

    expect(rows.map((row) => [row.key, row.share])).toEqual([
      ['orchestrator', 0.5],
      ['writer', 0.5],
    ]);
    expect(rankAgentRows(runSeries(), 1).map((row) => row.key)).toEqual(['orchestrator', 'writer']);
    expect(rankAgentRows(runSeries({ agents: [] }), 0)).toEqual([]);
  });
});
