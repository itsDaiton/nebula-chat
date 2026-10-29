import { describe, expect, it } from 'vitest';
import { formatSessionDate } from '@/modules/inspector/utils/formatSessionDate';

describe('formatSessionDate', () => {
  it('shows the day, short month and 24-hour time', () => {
    expect(formatSessionDate(new Date(2026, 9, 27, 18, 2).toISOString())).toBe('27 Oct, 18:02');
  });
});
