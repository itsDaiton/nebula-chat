import { describe, expect, it } from 'vitest';
import { formatUserDate, formatUserDay } from '@/modules/admin/utils/formatUserDate';

describe('formatUserDate', () => {
  it('writes a day as two digits and a three-letter month', () => {
    expect(formatUserDay('2026-03-12T10:00:00Z')).toBe('12 Mar');
    expect(formatUserDay('2026-09-07T10:00:00Z')).toBe('07 Sep');
  });

  it('adds the year for the detail', () => {
    expect(formatUserDate('2026-09-07T10:00:00Z')).toBe('07 Sep 2026');
  });
});
