import { describe, expect, it } from 'vitest';
import { estimateCost } from '../estimateCost';

describe('estimateCost', () => {
  it('prices input, cached input and output tokens per million at the catalog rates', () => {
    expect(estimateCost('gpt-4o-mini', { inputTokens: 1_000_000, outputTokens: 0 })).toBe(0.15);
    expect(
      estimateCost('gpt-4o-mini', {
        inputTokens: 0,
        cachedInputTokens: 1_000_000,
        outputTokens: 0,
      }),
    ).toBe(0.075);
    expect(estimateCost('gpt-4o-mini', { inputTokens: 0, outputTokens: 1_000_000 })).toBe(0.6);
  });

  it('adds the three parts of one call together', () => {
    expect(
      estimateCost('gpt-4.1', {
        inputTokens: 200_000,
        cachedInputTokens: 800_000,
        outputTokens: 50_000,
      }),
    ).toBe(1.2); // $0.40 uncached input + $0.40 cached input + $0.40 output
  });

  it('bills cached input below uncached input', () => {
    const uncached = estimateCost('gpt-5', { inputTokens: 100_000, outputTokens: 0 });
    const cached = estimateCost('gpt-5', {
      inputTokens: 0,
      cachedInputTokens: 100_000,
      outputTokens: 0,
    });

    expect(cached).toBeLessThan(uncached);
  });

  it('treats cached input as zero when the call reports none', () => {
    expect(estimateCost('gpt-5-mini', { inputTokens: 1_000, outputTokens: 1_000 })).toBe(
      estimateCost('gpt-5-mini', { inputTokens: 1_000, cachedInputTokens: 0, outputTokens: 1_000 }),
    );
  });

  it('returns 0 for zero tokens', () => {
    expect(estimateCost('claude-3-opus-20240229', { inputTokens: 0, outputTokens: 0 })).toBe(0);
  });

  it('rounds to the nearest millionth of a dollar', () => {
    // 7 input tokens at $0.15/M are $0.00000105; 3 output tokens at $0.60/M are $0.0000018.
    expect(estimateCost('gpt-4o-mini', { inputTokens: 7, outputTokens: 0 })).toBe(0.000001);
    expect(estimateCost('gpt-4o-mini', { inputTokens: 0, outputTokens: 3 })).toBe(0.000002);
  });

  it('rounds a call too small to register down to 0', () => {
    expect(
      estimateCost('gpt-5-mini', { inputTokens: 0, cachedInputTokens: 1, outputTokens: 0 }),
    ).toBe(0);
  });

  it('prices an Anthropic Model from its own rates', () => {
    expect(
      estimateCost('claude-3-5-haiku-20241022', {
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      }),
    ).toBe(4.8);
  });

  it('throws a named error for a Model not in the catalog', () => {
    expect(() => estimateCost('gpt-9000', { inputTokens: 1, outputTokens: 1 })).toThrow(
      'Unknown model: gpt-9000',
    );
  });
});
