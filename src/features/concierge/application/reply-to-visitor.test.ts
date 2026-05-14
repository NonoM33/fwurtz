import { describe, it, expect, vi } from "vitest";
import { makeReplyToVisitor } from "./reply-to-visitor";
import { ConciergeError } from "../domain/errors";
import type { LLMClient } from "../domain/types";

function fakeLLM(
  impl: (args: { systemPrompt: string; history: readonly { role: string; text: string }[] }) => Promise<string>,
): LLMClient {
  return { complete: impl };
}

describe("replyToVisitor", () => {
  it("forwards the trimmed LLM response when the call succeeds", async () => {
    const llm = fakeLLM(async () => "  Bien sûr, je vous oriente.  ");
    const reply = await makeReplyToVisitor({ llm })({
      history: [{ role: "user", text: "Bonjour" }],
      page: "accueil",
    });
    expect(reply.text).toBe("Bien sûr, je vous oriente.");
  });

  it("passes the canonical system prompt so brand voice stays consistent", async () => {
    type CompleteArgs = Parameters<LLMClient["complete"]>[0];
    const spy = vi.fn<(args: CompleteArgs) => Promise<string>>(async () => "ok");
    await makeReplyToVisitor({ llm: { complete: spy } })({
      history: [{ role: "user", text: "Bonjour" }],
      page: "accueil",
    });
    const call = spy.mock.calls[0];
    if (!call) throw new Error("expected one call");
    const [arg] = call;
    expect(arg.systemPrompt).toContain("Marie");
    expect(arg.history.length).toBe(1);
  });

  it("falls back to a scripted reply when the LLM throws an upstream failure", async () => {
    const llm = fakeLLM(async () => {
      throw new ConciergeError("Groq down", "upstream_failure");
    });
    const reply = await makeReplyToVisitor({ llm })({
      history: [{ role: "user", text: "Combien ça coûte ?" }],
      page: "accueil",
    });
    expect(reply.text.toLowerCase()).toMatch(/30 minutes|cr[eé]neau/);
  });

  it("falls back when the LLM returns an empty string", async () => {
    const llm = fakeLLM(async () => "   ");
    const reply = await makeReplyToVisitor({ llm })({
      history: [{ role: "user", text: "Quel délai pour un site ?" }],
      page: "sites-web",
    });
    expect(reply.text.toLowerCase()).toContain("site");
  });

  it("propagates rate_limited errors so the API can return 429", async () => {
    const llm = fakeLLM(async () => {
      throw new ConciergeError("upstream rate", "rate_limited");
    });
    await expect(
      makeReplyToVisitor({ llm })({
        history: [{ role: "user", text: "hi" }],
        page: "accueil",
      }),
    ).rejects.toBeInstanceOf(ConciergeError);
  });

  it("rejects an empty history (caller error)", async () => {
    const llm = fakeLLM(async () => "ok");
    await expect(
      makeReplyToVisitor({ llm })({ history: [], page: "accueil" }),
    ).rejects.toBeInstanceOf(ConciergeError);
  });
});
