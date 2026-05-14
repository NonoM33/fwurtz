import { afterEach, describe, expect, it } from "vitest";
import {
  getConciergeServices,
  resetConciergeServicesForTests,
} from "./composition";
import { ConciergeError } from "../domain/errors";

describe("getConciergeServices", () => {
  afterEach(() => resetConciergeServicesForTests());

  it("wires the dependency graph and returns reusable instances", () => {
    const services = getConciergeServices({ GROQ_API_KEY: "sk-x" });
    expect(services.rateLimiter.tryAcquire).toBeTypeOf("function");
    expect(services.replyToVisitor).toBeTypeOf("function");
    // memoized — second call returns the same graph
    expect(getConciergeServices({ GROQ_API_KEY: "sk-x" })).toBe(services);
  });

  it("bubbles missing_config when the API key is absent", () => {
    expect(() => getConciergeServices({})).toThrow(ConciergeError);
  });
});
