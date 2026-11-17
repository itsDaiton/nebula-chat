import { describe, expect, it } from 'vitest';
import {
  formatDay,
  formatLongDay,
  formatMetric,
  formatSeriesValue,
  formatSpend,
  formatTokens,
} from '@/modules/admin/utils/usageFormat';

describe('usage formatting', () => {
  it.each([
    [950, '950'],
    [12_300, '12.3K'],
    [41_200_000, '41.2M'],
  ])('shortens %d tokens to %s', (value, expected) => {
    expect(formatTokens(value)).toBe(expected);
  });

  it('keeps four decimals for a spend under a cent', () => {
    expect(formatSpend(0.0019)).toBe('$0.0019');
    expect(formatSpend(142.8)).toBe('$142.80');
    expect(formatSpend(0)).toBe('$0.00');
  });

  it('formats a value by metric, and as a percent in the Share view', () => {
    expect(formatMetric('prompts', 18240)).toBe('18,240');
    expect(formatMetric('spend', 1)).toBe('$1.00');
    expect(formatSeriesValue('tokens', 'volume', 2_000_000)).toBe('2.0M');
    expect(formatSeriesValue('tokens', 'share', 62.5)).toBe('62.5%');
  });

  it('names a UTC day, not the local one', () => {
    expect(formatDay('2026-10-19')).toBe('19 Oct');
    expect(formatLongDay('2026-10-19')).toBe('19 Oct 2026');
  });
});
