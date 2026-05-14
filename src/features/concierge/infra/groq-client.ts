import type { LLMClient, Message } from "../domain/types";
import { ConciergeError } from "../domain/errors";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

interface GroqClientOptions {
  readonly apiKey: string;
  readonly model: string;
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

  return {
    async complete({ systemPrompt, history }) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetchImpl(GROQ_ENDPOINT, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${opts.apiKey}`,
          },
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
            max_tokens: 280,
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
