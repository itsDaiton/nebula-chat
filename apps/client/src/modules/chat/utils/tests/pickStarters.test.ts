import { describe, expect, it } from 'vitest';
import { pickStarters } from '@/modules/chat/utils/pickStarters';

const pool = ['a', 'b', 'c', 'd', 'e', 'f'];

describe('pickStarters', () => {
  it('picks the requested number of distinct items from the pool', () => {
    const picked = pickStarters(pool, 4);

    expect(picked).toHaveLength(4);
    expect(new Set(picked).size).toBe(4);
    for (const item of picked) expect(pool).toContain(item);
  });

  it('follows the random source, so a different draw gives a different pick', () => {
    expect(pickStarters(pool, 2, () => 0)).toEqual(['a', 'b']);
    expect(pickStarters(pool, 2, () => 0.99)).toEqual(['f', 'a']);
  });

  it('returns the whole pool when it is smaller than the count', () => {
    expect(pickStarters(['a', 'b'], 4)).toHaveLength(2);
  });

  it('leaves the pool itself untouched', () => {
    pickStarters(pool, 4);

    expect(pool).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });
});
