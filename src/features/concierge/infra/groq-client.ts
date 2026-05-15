import type { LLMClient, Message } from "../domain/types";
import { ConciergeError } from "../domain/errors";

const DEFAULT_GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

interface GroqClientOptions {
  readonly apiKey: string;
  readonly model: string;
  /** Upstream chat-completions URL. Defaults to Groq; can be pointed at any
   *  OpenAI-compatible endpoint (OpenRouter, Cerebras, vLLM, etc.). */
  readonly endpoint?: string;
  /** Optional `HTTP-Referer` to send with the request. OpenRouter uses it
   *  for analytics and ranking. */
  readonly referer?: string;
  /** Optional `X-Title` for OpenRouter analytics. */
  readonly title?: string;
  /** Override fetch for testing. */
  readonly fetchImpl?: typeof fetch;
  /** Max upstream latency before we cut the call. Default 25 s. */
  readonly timeoutMs?: number;
}

interface GroqChoice {
  message?: { content?: string };
}
interface GroqResponse {
  choices?: GroqChoice[];
}

/**
 * Groq Chat Completions adapter implementing the {@link LLMClient} port.
 * Only Groq concerns live here — URL, auth, payload shape, error mapping.
 */
export function createGroqClient(opts: GroqClientOptions): LLMClient {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 25_000;
  const endpoint = opts.endpoint ?? DEFAULT_GROQ_ENDPOINT;

  return {
    async complete({ systemPrompt, history }) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${opts.apiKey}`,
        };
        if (opts.referer) headers["HTTP-Referer"] = opts.referer;
        if (opts.title) headers["X-Title"] = opts.title;
        const res = await fetchImpl(endpoint, {
          method: "POST",
          signal: controller.signal,
          headers,
          body: JSON.stringify({
            model: opts.model,
            messages: [
              { role: "system", content: systemPrompt },
              ...history.map((m) => ({
                role: m.role === "concierge" ? "assistant" : "user",
                content: m.text,
              })),
            ],
            temperature: 0.7,
            // gpt-oss-120b is a reasoning model: the budget is shared between
            // hidden reasoning tokens and the visible answer. With 280 the
            // whole budget went to reasoning and `content` came out empty.
            max_tokens: 1024,
            reasoning_effort: "low",
            top_p: 0.9,
          }),
        });

        if (res.status === 401 || res.status === 403) {
          throw new ConciergeError(
            "Groq rejected credentials",
            "upstream_unauthorized",
          );
        }
        if (res.status === 429) {
          throw new ConciergeError("Groq rate limit", "rate_limited");
        }
        if (!res.ok) {
          throw new ConciergeError(
            `Groq HTTP ${res.status}`,
            "upstream_failure",
          );
        }

        const body = (await res.json()) as GroqResponse;
        const content = body.choices?.[0]?.message?.content;
        return typeof content === "string" ? content : "";
      } catch (err) {
        if (err instanceof ConciergeError) throw err;
        throw new ConciergeError(
          err instanceof Error ? err.message : "Groq call failed",
          "upstream_failure",
        );
      } finally {
        clearTimeout(timer);
      }
    },
  } satisfies LLMClient;
}

// Re-export for tests.
export type { Message };
