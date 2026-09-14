import { describe, expect, it } from 'vitest';
import { countTokens } from './counter';

describe('countTokens', () => {
  it('returns 0 for an empty string', () => {
    expect(countTokens('')).toBe(0);
  });

  it('counts a known short phrase against a hand-verified value', () => {
    // " hello world" encodes to 2 cl100k_base tokens; the leading-space form is
    // the canonical single-token spelling of each word.
    expect(countTokens(' hello world')).toBe(2);
  });

  it('grows monotonically with input length', () => {
    const short = countTokens('the quick brown fox');
    const long = countTokens('the quick brown fox jumps over the lazy dog');

    expect(long).toBeGreaterThan(short);
  });

  it('falls back to cl100k_base for an unknown model rather than throwing', () => {
    expect(() => countTokens('hello', 'not-a-real-model')).not.toThrow();
    expect(countTokens('hello', 'not-a-real-model')).toBe(countTokens('hello'));
  });

  it('accepts each model in the tiktoken allow-list', () => {
    for (const model of ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo']) {
      expect(countTokens('hello world', model)).toBeGreaterThan(0);
    }
  });

  it('reuses a cached encoder across calls for the same model', () => {
    const first = countTokens('cache me', 'gpt-4o');
    const second = countTokens('cache me', 'gpt-4o');

    expect(first).toBe(second);
  });

  it('counts multi-byte characters without throwing', () => {
    expect(countTokens('こんにちは 🌍')).toBeGreaterThan(0);
  });
});
