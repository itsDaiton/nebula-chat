import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@server/modules/usage/usage.repository', () => ({
  usageRepository: {
    promptsByDay: vi.fn(),
    callsByDay: vi.fn(),
    dayStats: vi.fn(),
    totals: vi.fn(),
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
    });
    repo.totals.mockResolvedValueOnce(totals(8)).mockResolvedValueOnce(totals(4));

    const result = await usageService.getTotals({ range: '7d', audience: 'all' }, NOW);

    expect(repo.totals).toHaveBeenNthCalledWith(1, '2026-01-04', '2026-01-10', 'all');
    expect(repo.totals).toHaveBeenNthCalledWith(2, '2025-12-28', '2026-01-03', 'all');
    expect(result.prompts).toEqual({ total: 8, previousTotal: 4 });
    expect(result.cacheHitRate).toEqual({ rate: 0.25, previousRate: 0.25 });
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
    });

    const result = await usageService.getTotals({ range: '7d', audience: 'all' }, NOW);

    expect(result.cacheHitRate).toEqual({ rate: null, previousRate: null });
  });
});
