import { describe, expect, it } from 'vitest';
import { formatContextWindow } from '@/modules/chat/utils/formatContextWindow';

describe('formatContextWindow', () => {
  it('abbreviates to K and M', () => {
    expect(formatContextWindow(128_000)).toBe('128K');
    expect(formatContextWindow(400_000)).toBe('400K');
    expect(formatContextWindow(1_047_576)).toBe('1M');
  });
});
