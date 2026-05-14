import { describe, it, expect } from "vitest";
import { createInMemoryRateLimiter } from "./rate-limiter";

describe("createInMemoryRateLimiter", () => {
  it("admits requests up to the configured limit, then refuses", () => {
    let now = 0;
    const limiter = createInMemoryRateLimiter({
      limit: 3,
      windowMs: 60_000,
      clock: { now: () => now },
    });
    expect(limiter.tryAcquire("ip-1")).toBe(true);
    expect(limiter.tryAcquire("ip-1")).toBe(true);
    expect(limiter.tryAcquire("ip-1")).toBe(true);
    expect(limiter.tryAcquire("ip-1")).toBe(false);
  });

  it("tracks each key independently", () => {
    let now = 0;
    const limiter = createInMemoryRateLimiter({
      limit: 1,
      windowMs: 60_000,
      clock: { now: () => now },
    });
    expect(limiter.tryAcquire("ip-1")).toBe(true);
    expect(limiter.tryAcquire("ip-1")).toBe(false);
    expect(limiter.tryAcquire("ip-2")).toBe(true);
  });

  it("re-admits after the window slides past the oldest hit", () => {
    let now = 0;
    const limiter = createInMemoryRateLimiter({
      limit: 2,
      windowMs: 1_000,
      clock: { now: () => now },
    });
    expect(limiter.tryAcquire("ip")).toBe(true);
    now = 500;
    expect(limiter.tryAcquire("ip")).toBe(true);
    now = 800;
    expect(limiter.tryAcquire("ip")).toBe(false);
    now = 1_600; // first hit expires
    expect(limiter.tryAcquire("ip")).toBe(true);
  });

  it("evicts cold keys when the LRU budget is exceeded", () => {
    let now = 0;
    const limiter = createInMemoryRateLimiter({
      limit: 1,
      windowMs: 60_000,
      clock: { now: () => now },
      maxKeys: 2,
    });
    expect(limiter.tryAcquire("a")).toBe(true);
    now += 1;
    expect(limiter.tryAcquire("b")).toBe(true);
    now += 1;
    // 'c' triggers an eviction; 'a' (oldest) is dropped, so it gets a fresh slot.
    expect(limiter.tryAcquire("c")).toBe(true);
    now += 1;
    expect(limiter.tryAcquire("a")).toBe(true);
  });
});
