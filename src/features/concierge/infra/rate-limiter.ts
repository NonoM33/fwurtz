/**
 * In-memory sliding-window rate limiter. Fine for a single-instance deploy.
 * For horizontal scaling later, swap this for a Redis-backed implementation
 * — same interface, no other changes.
 */

export interface RateLimiter {
  /** True if the call should proceed, false if it must be throttled. */
  tryAcquire(key: string): boolean;
}

interface Clock {
  now(): number;
}

export function createInMemoryRateLimiter(opts: {
  readonly limit: number;
  readonly windowMs: number;
  readonly clock?: Clock;
  /** Cap the number of distinct keys we remember to avoid unbounded growth. */
  readonly maxKeys?: number;
}): RateLimiter {
  const clock: Clock = opts.clock ?? { now: () => Date.now() };
  const maxKeys = opts.maxKeys ?? 10_000;
  const hits = new Map<string, number[]>();

  return {
    tryAcquire(key: string): boolean {
      const now = clock.now();
      const cutoff = now - opts.windowMs;
      const arr = hits.get(key) ?? [];
      // drop expired entries in place
      let writeIndex = 0;
      for (const t of arr) {
        if (t > cutoff) {
          arr[writeIndex++] = t;
        }
      }
      arr.length = writeIndex;
      if (arr.length >= opts.limit) {
        hits.set(key, arr);
        return false;
      }
      arr.push(now);
      hits.set(key, arr);
      // Trim cold entries when we exceed the budget.
      if (hits.size > maxKeys) {
        const oldest = [...hits.entries()].sort(
          (a, b) => (a[1][a[1].length - 1] ?? 0) - (b[1][b[1].length - 1] ?? 0),
        )[0];
        if (oldest) hits.delete(oldest[0]);
      }
      return true;
    },
  };
}
