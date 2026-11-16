import { describe, expect, it } from 'vitest';
import { pickWaitingPhrase } from '@/modules/chat/utils/pickWaitingPhrase';

const phrases = ['a…', 'b…', 'c…'];

describe('pickWaitingPhrase', () => {
  it('follows the random source when there is no previous phrase', () => {
    expect(pickWaitingPhrase(phrases, undefined, () => 0)).toBe('a…');
    expect(pickWaitingPhrase(phrases, undefined, () => 0.99)).toBe('c…');
  });

  it('never returns the previous phrase, even when the draw points at it', () => {
    expect(pickWaitingPhrase(phrases, 'a…', () => 0)).toBe('b…');
    expect(pickWaitingPhrase(phrases, 'c…', () => 0.99)).toBe('b…');
  });
});
