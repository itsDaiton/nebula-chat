import { describe, expect, it } from 'vitest';
import {
  ACTIVE_PAINT,
  dateIndexOf,
  mutedPaint,
  seriesPaints,
  sortedDates,
} from '@/shared/utils/chartSeries';

const series = [
  { key: 'a', label: 'A' },
  { key: 'b', label: 'B' },
  { key: 'c', label: 'C' },
];

describe('seriesPaints', () => {
  it('paints the active series in the foreground and the rest in distinct greys', () => {
    const paints = seriesPaints(series, 'b');

    expect(paints[1]).toBe(ACTIVE_PAINT);
    expect(paints[0]).toBe(mutedPaint(0));
    expect(paints[2]).toBe(mutedPaint(1));
    expect(paints[0]).not.toBe(paints[2]);
  });

  it('paints every series muted when none is active', () => {
    expect(seriesPaints(series, null)).not.toContain(ACTIVE_PAINT);
  });

  it('keeps a series’ own paint and gives the others the next greys', () => {
    const paints = seriesPaints([{ ...series[0], paint: 'red' }, series[1], series[2]], 'c');

    expect(paints).toEqual(['red', mutedPaint(0), ACTIVE_PAINT]);
  });

  it('reuses the lightest grey past the last step', () => {
    expect(mutedPaint(50)).toBe(mutedPaint(100));
  });
});

describe('sortedDates and dateIndexOf', () => {
  const data = [
    { date: '2026-10-02', seriesKey: 'a', value: 1 },
    { date: '2026-10-01', seriesKey: 'a', value: 1 },
    { date: '2026-10-02', seriesKey: 'b', value: 1 },
  ];

  it('lists each day once, oldest first', () => {
    expect(sortedDates(data)).toEqual(['2026-10-01', '2026-10-02']);
  });

  it('finds the day index of a date and null when absent', () => {
    const dates = sortedDates(data);

    expect(dateIndexOf(dates, new Date('2026-10-02T00:00:00Z'))).toBe(1);
    expect(dateIndexOf(dates, new Date('2026-11-02T00:00:00Z'))).toBeNull();
    expect(dateIndexOf(dates, null)).toBeNull();
  });
});
