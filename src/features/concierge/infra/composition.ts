import { makeReplyToVisitor } from "../application/reply-to-visitor";
import { loadConciergeConfig } from "./config";
import { createGroqClient } from "./groq-client";
import { createInMemoryRateLimiter, type RateLimiter } from "./rate-limiter";

/**
 * Wires the concierge dependency graph for production runtime.
 * Pure module-level singletons — Astro reuses them across requests.
 */

let cached: {
  readonly replyToVisitor: ReturnType<typeof makeReplyToVisitor>;
  readonly rateLimiter: RateLimiter;
} | null = null;

export function getConciergeServices(env: Readonly<Record<string, string | undefined>>) {
  if (cached) return cached;
  const config = loadConciergeConfig({ env });
  const llm = createGroqClient({
    apiKey: config.groqApiKey,
    model: config.groqModel,
    ...(config.llmEndpoint ? { endpoint: config.llmEndpoint } : {}),
    ...(config.llmReferer ? { referer: config.llmReferer } : {}),
    ...(config.llmTitle ? { title: config.llmTitle } : {}),
  });
  const rateLimiter = createInMemoryRateLimiter({
    limit: config.rateLimit,
    windowMs: config.rateWindowSeconds * 1_000,
  });
  cached = { replyToVisitor: makeReplyToVisitor({ llm }), rateLimiter };
  return cached;
}

/** Test-only — drop the cached graph so subsequent calls re-read env. */
export function resetConciergeServicesForTests(): void {
  cached = null;
}
