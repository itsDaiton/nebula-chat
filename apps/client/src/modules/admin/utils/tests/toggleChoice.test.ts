import { describe, expect, it } from 'vitest';
import { toggleChoice } from '@/modules/admin/utils/toggleChoice';

describe('toggleChoice', () => {
  it('adds a value that is not chosen, keeping the order', () => {
    expect(toggleChoice(['failed'], 'partial')).toEqual(['failed', 'partial']);
  });

  it('removes a value that is chosen', () => {
    expect(toggleChoice(['failed', 'partial'], 'failed')).toEqual(['partial']);
  });

  it('gives undefined once the last one is removed', () => {
    expect(toggleChoice(['failed'], 'failed')).toBeUndefined();
  });
});
