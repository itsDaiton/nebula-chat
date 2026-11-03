import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from '@/shared/utils/relativeTime';

const NOW = new Date('2026-06-15T12:00:00.000Z').getTime();
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const ago = (ms: number) => formatRelativeTime(new Date(NOW - ms).toISOString(), NOW);

describe('formatRelativeTime', () => {
  it.each([
    [10_000, 'now'],
    [2 * MINUTE, '2m'],
    [59 * MINUTE, '59m'],
    [3 * HOUR, '3h'],
    [23 * HOUR, '23h'],
    [DAY, '1d'],
    [6 * DAY, '6d'],
    [7 * DAY, '1w'],
    [20 * DAY, '2w'],
    [30 * DAY, '1mo'],
    [75 * DAY, '2mo'],
    [365 * DAY, '1y'],
    [800 * DAY, '2y'],
  ])('writes %i ms ago as %s', (elapsed, expected) => {
    expect(ago(elapsed)).toBe(expected);
  });

  it('reads a time slightly in the future as now', () => {
    expect(ago(-5_000)).toBe('now');
  });
});
