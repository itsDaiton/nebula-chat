import { describe, expect, it } from 'vitest';
import type { UsageTotals } from '@/libs/api/generated/model/usageTotals';
import { usageTiles } from '@/modules/admin/utils/usageTiles';

const pair = (total: number, previousTotal: number) => ({ total, previousTotal });

const totals = (overrides: Partial<UsageTotals> = {}): UsageTotals => ({
  range: '30d',
  prompts: pair(110, 100),
  tokens: pair(2_500_000, 5_000_000),
  spend: pair(10, 10),
  activeUsers: pair(5, 0),
  runs: pair(1, 1),
  cacheHitRate: { rate: 0.114, previousRate: 0.126 },
  ...overrides,
});

describe('usageTiles', () => {
  it('compares each total with the previous period', () => {
    const tiles = usageTiles(totals());

    expect(tiles.map((tile) => tile.id)).toEqual([
      'prompts',
      'tokens',
      'spend',
      'activeUsers',
      'runs',
      'cacheHitRate',
    ]);
    expect(tiles[0]).toMatchObject({ value: '110', delta: { direction: 'up', text: '10.0%' } });
    expect(tiles[1]).toMatchObject({ value: '2.5M', delta: { direction: 'down', text: '50.0%' } });
    expect(tiles[2].delta?.direction).toBe('flat');
  });

  it('shows no delta when the previous period was empty', () => {
    expect(usageTiles(totals())[3].delta).toBeNull();
  });

  it('shows the cache hit rate as a percent with a change in points', () => {
    expect(usageTiles(totals())[5]).toMatchObject({
      value: '11.4%',
      delta: { direction: 'down', text: '1.2 pt' },
    });
  });

  it('shows a dash for a cache hit rate without calls', () => {
    const tile = usageTiles(totals({ cacheHitRate: { rate: null, previousRate: null } }))[5];

    expect(tile).toEqual({ id: 'cacheHitRate', value: '—', delta: null });
  });
});
