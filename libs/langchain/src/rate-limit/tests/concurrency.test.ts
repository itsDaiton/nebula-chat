import { describe, expect, it } from 'vitest';
import { llmConcurrencyLimiter } from '../concurrency';

describe('llmConcurrencyLimiter', () => {
  it('caps simultaneous in-flight calls at 10', async () => {
    let inFlight = 0;
    let peak = 0;

    const task = async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
    };

    await Promise.all(Array.from({ length: 25 }, () => llmConcurrencyLimiter(task)));

    expect(peak).toBe(10);
    expect(inFlight).toBe(0);
  });

  it('propagates a rejection without wedging the limiter', async () => {
    await expect(
      llmConcurrencyLimiter(() => Promise.reject(new Error('task failed'))),
    ).rejects.toThrow('task failed');

    await expect(llmConcurrencyLimiter(() => Promise.resolve('ok'))).resolves.toBe('ok');
  });

  it('returns the resolved value of the wrapped task', async () => {
    await expect(llmConcurrencyLimiter(() => Promise.resolve(42))).resolves.toBe(42);
  });
});
