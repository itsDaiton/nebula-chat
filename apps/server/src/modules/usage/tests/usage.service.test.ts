import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@server/modules/usage/usage.repository', () => ({
  usageRepository: {
    promptsByDay: vi.fn(),
    callsByDay: vi.fn(),
    dayStats: vi.fn(),
    totals: vi.fn(),
    runsByDay: vi.fn(),
    agentCallsByDay: vi.fn(),
    agentTrendByDay: vi.fn(),
    agentDayStats: vi.fn(),
  },
}));

import { usageRepository } from '@server/modules/usage/usage.repository';
import { usageService } from '@server/modules/usage/usage.service';

const repo = vi.mocked(usageRepository);
const NOW = new Date('2026-01-10T15:00:00Z');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getSeries', () => {
  it('fills every day with zeros, oldest first, today included', async () => {
    repo.promptsByDay.mockResolvedValue([
      { day: '2026-01-10', key: 'gpt-4o', value: 4 },
      { day: '2026-01-08', key: 'gpt-4o', value: 1 },
    ]);

    const result = await usageService.getSeries(
      { metric: 'prompts', range: '7d', audience: 'all' },
      NOW,
    );

    expect(result.days[0]).toBe('2026-01-04');
    expect(result.days.at(-1)).toBe('2026-01-10');
    expect(result.series).toEqual([
      {
        key: 'gpt-4o',
        kind: 'model',
        total: 5,
        values: [0, 0, 0, 0, 1, 0, 4],
        members: [],
      },
    ]);
    expect(repo.promptsByDay).toHaveBeenCalledWith('2026-01-04', '2026-01-10', 'all', undefined);
  });

  it('lists the Run series apart from the Models in Prompts', async () => {
    repo.promptsByDay.mockResolvedValue([
      { day: '2026-01-10', key: 'gpt-4o', value: 2 },
      { day: '2026-01-10', key: 'run', value: 5 },
    ]);

    const { series } = await usageService.getSeries(
      { metric: 'prompts', range: '7d', audience: 'all' },
      NOW,
    );

    expect(series.map(({ key, kind }) => [key, kind])).toEqual([
      ['run', 'run'],
      ['gpt-4o', 'model'],
    ]);
  });

  it('reads tokens and spend from Model calls', async () => {
    repo.callsByDay.mockResolvedValue([{ day: '2026-01-10', key: 'gpt-4o', value: 0.5 }]);

    const { series } = await usageService.getSeries(
      { metric: 'spend', range: '7d', audience: 'registered', models: ['gpt-4o'] },
      NOW,
    );

    expect(series[0]?.total).toBe(0.5);
    expect(repo.callsByDay).toHaveBeenCalledWith(
      'spend',
      '2026-01-04',
      '2026-01-10',
      'registered',
      ['gpt-4o'],
    );
    expect(repo.promptsByDay).not.toHaveBeenCalled();
  });

  it('groups Models beyond the top 8 into other', async () => {
    repo.callsByDay.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({
        day: '2026-01-10',
        key: `model-${String(i)}`,
        value: 10 - i,
      })),
    );

    const { series } = await usageService.getSeries(
      { metric: 'tokens', range: '7d', audience: 'all' },
      NOW,
    );

    expect(series).toHaveLength(9);
    expect(series.at(-1)).toMatchObject({
      key: 'other',
      kind: 'other',
      total: 3,
      members: [
        expect.objectContaining({ key: 'model-8', total: 2 }),
        expect.objectContaining({ key: 'model-9', total: 1 }),
      ],
    });
    expect(series.at(-1)?.values.at(-1)).toBe(3);
  });
});

describe('getDetail', () => {
  it('combines the day’s call stats with the Model’s Prompts trend', async () => {
    repo.dayStats.mockResolvedValue({
      calls: 4,
      inputPerCall: 100,
      outputPerCall: 20,
      costPerCall: 0.001,
      cacheReplays: 1,
      completionRate: 0.75,
      avgDurationMs: 900,
    });
    repo.promptsByDay.mockResolvedValue([
      { day: '2026-01-09', key: 'gpt-4o', value: 3 },
      { day: '2026-01-10', key: 'gpt-4o', value: 6 },
    ]);

    const detail = await usageService.getDetail(
      { model: 'gpt-4o', day: '2026-01-09', range: '7d', audience: 'all' },
      NOW,
    );

    expect(detail).toMatchObject({ prompts: 3, calls: 4, cacheReplays: 1, completionRate: 0.75 });
    expect(detail.trend).toEqual([0, 0, 0, 0, 0, 3, 6]);
    expect(repo.promptsByDay).toHaveBeenCalledWith('2026-01-04', '2026-01-10', 'all', ['gpt-4o']);
  });
});

describe('getTotals', () => {
  it('compares the range with the period before it and derives the cache hit rate', async () => {
    const totals = (n: number) => ({
      prompts: n,
      tokens: n * 10,
      spend: n / 2,
      activeUsers: n,
      runs: n,
      calls: n * 4,
      cacheReplays: n,
      runSteps: n * 6,
      runCalls: n * 3,
      runTokens: n * 100,
      runSpend: n,
      runDurationMs: n * 1000,
    });
    repo.totals.mockResolvedValueOnce(totals(8)).mockResolvedValueOnce(totals(4));

    const result = await usageService.getTotals({ range: '7d', audience: 'all' }, NOW);

    expect(repo.totals).toHaveBeenNthCalledWith(1, '2026-01-04', '2026-01-10', 'all');
    expect(repo.totals).toHaveBeenNthCalledWith(2, '2025-12-28', '2026-01-03', 'all');
    expect(result.prompts).toEqual({ total: 8, previousTotal: 4 });
    expect(result.cacheHitRate).toEqual({ rate: 0.25, previousRate: 0.25 });
    expect(result.runAverages).toEqual({
      stepsPerRun: { value: 6, previousValue: 6 },
      callsPerRun: { value: 3, previousValue: 3 },
      tokensPerRun: { value: 100, previousValue: 100 },
      costPerRun: { value: 1, previousValue: 1 },
      durationMs: { value: 8000, previousValue: 4000 },
    });
  });

  it('has no rate without calls', async () => {
    repo.totals.mockResolvedValue({
      prompts: 0,
      tokens: 0,
      spend: 0,
      activeUsers: 0,
      runs: 0,
      calls: 0,
      cacheReplays: 0,
      runSteps: 0,
      runCalls: 0,
      runTokens: 0,
      runSpend: 0,
      runDurationMs: null,
    });

    const result = await usageService.getTotals({ range: '7d', audience: 'all' }, NOW);

    expect(result.cacheHitRate).toEqual({ rate: null, previousRate: null });
    expect(result.runAverages.stepsPerRun).toEqual({ value: null, previousValue: null });
    expect(result.runAverages.durationMs).toEqual({ value: null, previousValue: null });
  });
});

describe('getRunSeries', () => {
  it('zero-fills Runs by outcome and ranks Agents by spend', async () => {
    repo.runsByDay.mockResolvedValue([
      { day: '2026-01-10', key: 'completed', value: 3 },
      { day: '2026-01-09', key: 'failed', value: 1 },
      { day: '2026-01-10', key: 'running', value: 2 },
    ]);
    repo.agentCallsByDay.mockResolvedValue([
      { day: '2026-01-10', key: 'writer', spend: 0.1, tokens: 50 },
      { day: '2026-01-10', key: 'orchestrator', spend: 0.4, tokens: 200 },
      { day: '2026-01-09', key: 'orchestrator', spend: 0.2, tokens: 100 },
    ]);

    const result = await usageService.getRunSeries({ range: '7d', audience: 'all' }, NOW);

    expect(result.days).toHaveLength(7);
    expect(result.outcomes.map(({ outcome }) => outcome)).toEqual([
      'completed',
      'partial',
      'failed',
      'cancelled',
    ]);
    expect(result.outcomes[0]).toEqual({
      outcome: 'completed',
      total: 3,
      values: [0, 0, 0, 0, 0, 0, 3],
    });
    expect(result.outcomes[1]?.total).toBe(0);
    expect(result.outcomes[2]?.values).toEqual([0, 0, 0, 0, 0, 1, 0]);
    expect(result.agents.map(({ key }) => key)).toEqual(['orchestrator', 'writer']);
    expect(result.agents[0]).toMatchObject({
      spendTotal: expect.closeTo(0.6),
      tokensTotal: 300,
      tokens: [0, 0, 0, 0, 0, 100, 200],
    });
    expect(repo.runsByDay).toHaveBeenCalledWith('2026-01-04', '2026-01-10', 'all');
  });

  it('returns empty ranking and zero outcomes without Runs', async () => {
    repo.runsByDay.mockResolvedValue([]);
    repo.agentCallsByDay.mockResolvedValue([]);

    const result = await usageService.getRunSeries({ range: '7d', audience: 'guests' }, NOW);

    expect(result.agents).toEqual([]);
    expect(result.outcomes.every(({ total }) => total === 0)).toBe(true);
  });
});

describe('getAgentDetail', () => {
  it('returns the Agent’s day stats with its calls trend', async () => {
    repo.agentDayStats.mockResolvedValue({
      calls: 5,
      inputPerCall: 100,
      outputPerCall: 20,
      costPerCall: 0.01,
      cacheReplays: 1,
      completionRate: 0.8,
      avgDurationMs: 700,
    });
    repo.agentTrendByDay.mockResolvedValue([{ day: '2026-01-10', key: 'writer', value: 5 }]);

    const detail = await usageService.getAgentDetail(
      { agent: 'writer', day: '2026-01-10', range: '7d', audience: 'all' },
      NOW,
    );

    expect(detail).toMatchObject({ agent: 'writer', calls: 5, completionRate: 0.8 });
    expect(detail.trend).toEqual([0, 0, 0, 0, 0, 0, 5]);
    expect(repo.agentDayStats).toHaveBeenCalledWith('writer', '2026-01-10', 'all');
  });
});
