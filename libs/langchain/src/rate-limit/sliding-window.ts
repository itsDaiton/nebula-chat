export type RateLimiterOptions = {
  windowMs: number; // sliding window duration
  maxRequests: number; // max calls per window per key
};

export type RateLimiter = {
  check: (userId: string) => { allowed: boolean; retryAfterMs: number };
};

// In-memory sliding window rate limiter keyed by userId.
// userId defaults to 'anonymous' so this works pre-auth;
// once M-6 lands, pass the JWT subject as userId.
export const createRateLimiter = (options: RateLimiterOptions): RateLimiter => {
  const { windowMs, maxRequests } = options;
  const buckets = new Map<string, number[]>();

  return {
    check: (userId: string) => {
      const now = Date.now();
      const cutoff = now - windowMs;

      const timestamps = (buckets.get(userId) ?? []).filter((t) => t > cutoff);
      buckets.set(userId, timestamps);

      if (timestamps.length >= maxRequests) {
        const retryAfterMs = timestamps[0] - cutoff;
        return { allowed: false, retryAfterMs };
      }

      timestamps.push(now);
      return { allowed: true, retryAfterMs: 0 };
    },
  };
};
