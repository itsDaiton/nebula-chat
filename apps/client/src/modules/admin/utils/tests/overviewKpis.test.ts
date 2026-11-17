import { describe, expect, it } from 'vitest';
import type { AdminOverview } from '@/libs/api/generated/model/adminOverview';
import { overviewTiles } from '@/modules/admin/utils/overviewKpis';

const kpi = (total: number, previousTotal: number) => ({ total, previousTotal, series: [1, 2] });

const overview = (guestConversion: AdminOverview['kpis']['guestConversion']): AdminOverview => ({
  range: '7d',
  days: ['2026-11-09', '2026-11-10'],
  kpis: {
    dailyActiveUsers: kpi(200, 100),
    weeklyActiveUsers: kpi(1082, 1082),
    newRegistrations: kpi(3, 0),
    messagesSent: kpi(50, 100),
    estimatedSpend: kpi(142.8, 121.8),
    guestConversion,
  },
});

const byId = (tiles: ReturnType<typeof overviewTiles>, id: string) =>
  tiles.find((tile) => tile.id === id)!;

describe('overviewTiles', () => {
  const tiles = overviewTiles(
    overview({
      conversions: 2,
      previousConversions: 1,
      rate: 0.068,
      previousRate: 0.059,
      series: [0, 2],
    }),
  );

  it('formats counts and compares them with the previous period', () => {
    expect(byId(tiles, 'dailyActiveUsers')).toMatchObject({
      value: '200',
      delta: { direction: 'up', text: '100.0%' },
    });
    expect(byId(tiles, 'weeklyActiveUsers').delta).toEqual({ direction: 'flat', text: '0.0%' });
    expect(byId(tiles, 'messagesSent').delta).toEqual({ direction: 'down', text: '50.0%' });
    expect(byId(tiles, 'weeklyActiveUsers').value).toBe('1,082');
  });

  it('formats estimated spend in dollars and compares it with the previous period', () => {
    expect(byId(tiles, 'estimatedSpend')).toMatchObject({
      value: '$142.80',
      delta: { direction: 'up', text: '17.2%' },
    });
  });

  it('shows a fractional count to one decimal instead of rounding it away', () => {
    const quiet = overviewTiles({
      ...overview({
        conversions: 0,
        previousConversions: 0,
        rate: null,
        previousRate: null,
        series: [],
      }),
      kpis: {
        ...overview({
          conversions: 0,
          previousConversions: 0,
          rate: null,
          previousRate: null,
          series: [],
        }).kpis,
        dailyActiveUsers: kpi(0.4, 0.1),
      },
    });

    expect(byId(quiet, 'dailyActiveUsers')).toMatchObject({
      value: '0.4',
      delta: { direction: 'up', text: '300.0%' },
    });
  });

  it('has no delta against an empty previous period', () => {
    expect(byId(tiles, 'newRegistrations').delta).toBeNull();
  });

  it('shows the conversion rate with its change in percentage points', () => {
    expect(byId(tiles, 'guestConversion')).toMatchObject({
      value: '6.8%',
      delta: { direction: 'up', text: '0.9 pt' },
      series: [0, 2],
    });
  });

  it('shows a dash when there were no Guests to convert', () => {
    const empty = overviewTiles(
      overview({
        conversions: 0,
        previousConversions: 0,
        rate: null,
        previousRate: null,
        series: [],
      }),
    );

    expect(byId(empty, 'guestConversion')).toMatchObject({ value: '—', delta: null });
  });
});
