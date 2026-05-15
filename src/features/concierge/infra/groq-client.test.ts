import { describe, it, expect, vi } from "vitest";
import { createGroqClient } from "./groq-client";
import { ConciergeError } from "../domain/errors";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

type FetchSpy = ReturnType<typeof vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>>;

function fakeFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>): {
  spy: FetchSpy;
  fetchImpl: typeof fetch;
} {
  const spy = vi.fn(impl) as FetchSpy;
  return { spy, fetchImpl: spy as unknown as typeof fetch };
}

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
interface GroqBody {
  model: string;
  messages: GroqMessage[];
  max_tokens?: number;
  reasoning_effort?: string;
}

describe("createGroqClient", () => {
  it("posts a chat-completions payload with system prompt and mapped history", async () => {
    const { spy, fetchImpl } = fakeFetch(async () =>
      jsonResponse({ choices: [{ message: { content: "Bonsoir." } }] }),
    );
    const client = createGroqClient({ apiKey: "sk-test", model: "openai/gpt-oss-120b", fetchImpl });
    const reply = await client.complete({
      systemPrompt: "PROMPT",
      history: [
        { role: "user", text: "Bonjour" },
        { role: "concierge", text: "Bonsoir, je vous écoute" },
        { role: "user", text: "Combien ?" },
      ],
    });
    expect(reply).toBe("Bonsoir.");

    expect(spy).toHaveBeenCalledOnce();
    const call = spy.mock.calls[0]!;
    const [url, init] = call;
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(init?.method).toBe("POST");
    const headers = init?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer sk-test");
    const body = JSON.parse(String(init?.body)) as GroqBody;
    expect(body.model).toBe("openai/gpt-oss-120b");
    expect(body.messages[0]).toEqual({ role: "system", content: "PROMPT" });
    expect(body.messages[1]).toEqual({ role: "user", content: "Bonjour" });
    expect(body.messages[2]).toEqual({ role: "assistant", content: "Bonsoir, je vous écoute" });
  });

  // Regression: gpt-oss-120b is a reasoning model. With a tight max_tokens
  // budget the hidden reasoning chain consumes everything and `content`
  // comes back empty (we observed this on staging — finish_reason="length",
  // 38 reasoning tokens, 0 visible tokens). The fix is a higher budget AND
  // `reasoning_effort: "low"` so the model spends little on chain-of-thought.
  it("requests a token budget large enough to leave room for the answer after reasoning", async () => {
    const { spy, fetchImpl } = fakeFetch(async () =>
      jsonResponse({ choices: [{ message: { content: "ok" } }] }),
    );
    const client = createGroqClient({ apiKey: "sk", model: "openai/gpt-oss-120b", fetchImpl });
    await client.complete({
      systemPrompt: "p",
      history: [{ role: "user", text: "Combien ça coûte ?" }],
    });
    const body = JSON.parse(String(spy.mock.calls[0]![1]?.body)) as GroqBody;
    expect(body.max_tokens ?? 0).toBeGreaterThanOrEqual(1024);
    expect(body.reasoning_effort).toBe("low");
  });

  it("maps a 401 response to upstream_unauthorized so we can surface the right error", async () => {
    const { fetchImpl } = fakeFetch(async () => new Response("nope", { status: 401 }));
    const client = createGroqClient({ apiKey: "sk", model: "m", fetchImpl });
    await expect(
      client.complete({ systemPrompt: "p", history: [{ role: "user", text: "h" }] }),
    ).rejects.toMatchObject({ code: "upstream_unauthorized" });
  });

  it("maps a 429 response to rate_limited", async () => {
    const { fetchImpl } = fakeFetch(async () => new Response(null, { status: 429 }));
    const client = createGroqClient({ apiKey: "sk", model: "m", fetchImpl });
    await expect(
      client.complete({ systemPrompt: "p", history: [{ role: "user", text: "h" }] }),
    ).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("wraps other non-2xx statuses as upstream_failure", async () => {
    const { fetchImpl } = fakeFetch(async () => new Response(null, { status: 503 }));
    const client = createGroqClient({ apiKey: "sk", model: "m", fetchImpl });
    await expect(
      client.complete({ systemPrompt: "p", history: [{ role: "user", text: "h" }] }),
    ).rejects.toMatchObject({ code: "upstream_failure" });
  });

  it("returns an empty string when Groq replies without text content", async () => {
    const { fetchImpl } = fakeFetch(async () => jsonResponse({ choices: [{}] }));
    const client = createGroqClient({ apiKey: "sk", model: "m", fetchImpl });
    const reply = await client.complete({
      systemPrompt: "p",
      history: [{ role: "user", text: "h" }],
    });
    expect(reply).toBe("");
  });

  it("wraps unexpected fetch errors as upstream_failure", async () => {
    const { fetchImpl } = fakeFetch(async () => {
      throw new Error("dns lookup failed");
    });
    const client = createGroqClient({ apiKey: "sk", model: "m", fetchImpl });
    await expect(
      client.complete({ systemPrompt: "p", history: [{ role: "user", text: "h" }] }),
    ).rejects.toBeInstanceOf(ConciergeError);
  });
});
