import { describe, expect, it } from 'vitest';
import { initialsOf } from '@/shared/utils/initialsOf';

describe('initialsOf', () => {
  it.each([
    ['David Poslušný', 'DP'],
    ['Ada', 'A'],
    ['  grace  brewster   hopper ', 'GH'],
    ['', ''],
  ])('turns %j into %j', (name, expected) => {
    expect(initialsOf(name)).toBe(expected);
  });
});
