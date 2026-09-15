import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRateLimiter } from '../sliding-window';

describe('createRateLimiter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests up to maxRequests within the window', () => {
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 3 });

    expect(limiter.check('user-1').allowed).toBe(true);
    expect(limiter.check('user-1').allowed).toBe(true);
    expect(limiter.check('user-1').allowed).toBe(true);

    limiter.destroy();
  });

  it('rejects the request that exceeds maxRequests', () => {
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 2 });

    limiter.check('user-1');
    limiter.check('user-1');
    const rejected = limiter.check('user-1');

    expect(rejected.allowed).toBe(false);
    expect(rejected.retryAfterMs).toBeGreaterThan(0);

    limiter.destroy();
  });

  it('tracks each user independently', () => {
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 1 });

    expect(limiter.check('user-1').allowed).toBe(true);
    expect(limiter.check('user-1').allowed).toBe(false);
    expect(limiter.check('user-2').allowed).toBe(true);

    limiter.destroy();
  });

  it('allows a request again once the window has slid past the oldest timestamp', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 1 });

    expect(limiter.check('user-1').allowed).toBe(true);
    expect(limiter.check('user-1').allowed).toBe(false);

    vi.setSystemTime(new Date('2026-01-01T00:00:01.001Z'));
    expect(limiter.check('user-1').allowed).toBe(true);

    limiter.destroy();
  });

  it('reports retryAfterMs as the time until the oldest timestamp leaves the window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 1 });

    limiter.check('user-1');
    vi.setSystemTime(new Date('2026-01-01T00:00:00.400Z'));

    // oldest stamp at t=0, window 1000ms, now t=400 -> 600ms remaining
    expect(limiter.check('user-1').retryAfterMs).toBe(600);

    limiter.destroy();
  });

  it('evicts fully expired buckets on the periodic sweep', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 1 });

    limiter.check('user-1');

    // Advance past the window so the sweep drops the bucket, then confirm the
    // user is served as if brand new.
    vi.setSystemTime(new Date('2026-01-01T00:00:02Z'));
    vi.advanceTimersByTime(1000);

    expect(limiter.check('user-1').allowed).toBe(true);

    limiter.destroy();
  });

  it('keeps buckets that still hold live timestamps through a sweep', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const limiter = createRateLimiter({ windowMs: 10_000, maxRequests: 2 });

    // Stamp at t=5s, so the sweep at t=10s sees a cutoff of t=0 and must keep it.
    // (Stamping at t=0 would expire exactly as the first sweep fires.)
    vi.advanceTimersByTime(5_000);
    limiter.check('user-1');
    vi.advanceTimersByTime(5_000);

    // The surviving stamp still counts, so only one more request fits.
    expect(limiter.check('user-1').allowed).toBe(true);
    expect(limiter.check('user-1').allowed).toBe(false);

    limiter.destroy();
  });

  it('stops the sweep timer on destroy', () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 1 });

    limiter.destroy();

    expect(clearSpy).toHaveBeenCalled();
  });
});
