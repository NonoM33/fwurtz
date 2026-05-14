import { describe, it, expect } from "vitest";
import { ChatRequestSchema } from "./validation";

describe("ChatRequestSchema", () => {
  it("accepts a minimal valid payload and defaults the page to 'accueil'", () => {
    const result = ChatRequestSchema.safeParse({
      history: [{ role: "user", text: "Bonjour" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe("accueil");
    }
  });

  it("rejects an empty history (need at least the user's first message)", () => {
    expect(ChatRequestSchema.safeParse({ history: [] }).success).toBe(false);
  });

  it("rejects messages with unknown roles", () => {
    const r = ChatRequestSchema.safeParse({
      history: [{ role: "assistant", text: "hi" }],
    });
    expect(r.success).toBe(false);
  });

  it("rejects oversized message text (defense against prompt-flood abuse)", () => {
    const huge = "a".repeat(2_001);
    expect(
      ChatRequestSchema.safeParse({ history: [{ role: "user", text: huge }] }).success,
    ).toBe(false);
  });

  it("rejects unknown page contexts so the LLM context stays predictable", () => {
    expect(
      ChatRequestSchema.safeParse({
        history: [{ role: "user", text: "hi" }],
        page: "homepage",
      }).success,
    ).toBe(false);
  });

  it("caps history at 32 messages", () => {
    const long = Array.from({ length: 33 }, (_v, i) => ({
      role: "user" as const,
      text: `msg ${i}`,
    }));
    expect(ChatRequestSchema.safeParse({ history: long }).success).toBe(false);
  });
});
