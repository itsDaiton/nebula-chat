export type RateLimiterOptions = {
  windowMs: number; // sliding window duration
  maxRequests: number; // max calls per window per key
};

export type RateLimiter = {
  check: (userId: string) => { allowed: boolean; retryAfterMs: number };
  /** Release the background sweep timer. Call on process shutdown or in tests. */
  destroy: () => void;
};

// In-memory sliding window rate limiter keyed by userId.
// userId defaults to 'anonymous' so this works pre-auth;
// once M-6 lands, pass the JWT subject as userId.
//
// A periodic sweep evicts buckets whose timestamps have all expired, preventing
// unbounded map growth when the set of userIds is large (e.g. after M-6 auth).
export const createRateLimiter = (options: RateLimiterOptions): RateLimiter => {
  const { windowMs, maxRequests } = options;
  const buckets = new Map<string, number[]>();

  const sweep = () => {
    const cutoff = Date.now() - windowMs;
    for (const [key, timestamps] of buckets) {
      if (!timestamps.some((t) => t > cutoff)) {
        buckets.delete(key);
      }
    }
  };

  const timer = setInterval(sweep, windowMs);
  // Prevent the sweep timer from keeping the Node.js event loop alive.
  (timer as NodeJS.Timeout).unref?.();

  return {
    check: (userId: string) => {
      const now = Date.now();
      const cutoff = now - windowMs;

      const timestamps = (buckets.get(userId) ?? []).filter((t) => t > cutoff);
      if (timestamps.length === 0) {
        buckets.delete(userId);
      } else {
        buckets.set(userId, timestamps);
      }

      if (timestamps.length >= maxRequests) {
        const retryAfterMs = timestamps[0] + windowMs - now;
        return { allowed: false, retryAfterMs };
      }

      timestamps.push(now);
      buckets.set(userId, timestamps);
      return { allowed: true, retryAfterMs: 0 };
    },

    destroy: () => clearInterval(timer),
  };
};
