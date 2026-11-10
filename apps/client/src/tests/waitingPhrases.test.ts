import { describe, expect, it } from 'vitest';
import { WAITING_PHRASES } from '@/waitingPhrases';

describe('WAITING_PHRASES', () => {
  it('holds 12 distinct phrases of one to three words, each ending in an ellipsis', () => {
    expect(WAITING_PHRASES).toHaveLength(12);
    expect(new Set(WAITING_PHRASES).size).toBe(12);
    for (const phrase of WAITING_PHRASES) {
      expect(phrase.endsWith('…')).toBe(true);
      expect(phrase.split(' ').length).toBeLessThanOrEqual(3);
    }
  });
});
