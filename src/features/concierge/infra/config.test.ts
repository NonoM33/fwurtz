import { describe, it, expect } from "vitest";
import { loadConciergeConfig } from "./config";
import { ConciergeError } from "../domain/errors";

describe("loadConciergeConfig", () => {
  it("returns sensible defaults when only the required key is set", () => {
    const config = loadConciergeConfig({ env: { GROQ_API_KEY: "sk-test" } });
    expect(config.groqApiKey).toBe("sk-test");
    expect(config.groqModel).toBe("openai/gpt-oss-120b");
    expect(config.rateLimit).toBe(20);
    expect(config.rateWindowSeconds).toBe(60);
  });

  it("throws missing_config when the API key is absent (typed for callers)", () => {
    try {
      loadConciergeConfig({ env: {} });
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ConciergeError);
      expect((err as ConciergeError).code).toBe("missing_config");
    }
  });

  it("treats whitespace-only API keys as missing — common deploy mistake", () => {
    expect(() => loadConciergeConfig({ env: { GROQ_API_KEY: "   " } })).toThrow(ConciergeError);
  });

  it("overrides the model when GROQ_MODEL is provided", () => {
    const config = loadConciergeConfig({
      env: { GROQ_API_KEY: "sk", GROQ_MODEL: "llama-3.3-70b" },
    });
    expect(config.groqModel).toBe("llama-3.3-70b");
  });

  it("falls back to defaults for non-numeric rate-limit values", () => {
    const config = loadConciergeConfig({
      env: {
        GROQ_API_KEY: "sk",
        CONCIERGE_RATE_LIMIT: "not-a-number",
        CONCIERGE_RATE_WINDOW_SECONDS: "-5",
      },
    });
    expect(config.rateLimit).toBe(20);
    expect(config.rateWindowSeconds).toBe(60);
  });

  it("accepts custom rate-limit values", () => {
    const config = loadConciergeConfig({
      env: {
        GROQ_API_KEY: "sk",
        CONCIERGE_RATE_LIMIT: "5",
        CONCIERGE_RATE_WINDOW_SECONDS: "10",
      },
    });
    expect(config.rateLimit).toBe(5);
    expect(config.rateWindowSeconds).toBe(10);
  });
});
