import { describe, expect, it } from 'vitest';
import { isMessageAllowanceLow } from '@/modules/chat/utils/isMessageAllowanceLow';

describe('isMessageAllowanceLow', () => {
  it.each([
    [3, 10],
    [1, 10],
    [0, 10],
    [30, 100],
  ])('is low with %i of %i left', (remaining, limit) => {
    expect(isMessageAllowanceLow(remaining, limit)).toBe(true);
  });

  it.each([
    [4, 10],
    [10, 10],
    [31, 100],
  ])('is not low with %i of %i left', (remaining, limit) => {
    expect(isMessageAllowanceLow(remaining, limit)).toBe(false);
  });

  it('warns at one message left even when 30% of the limit rounds down to zero', () => {
    expect(isMessageAllowanceLow(1, 3)).toBe(true);
    expect(isMessageAllowanceLow(2, 3)).toBe(false);
  });
});
