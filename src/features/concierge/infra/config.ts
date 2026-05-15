import { ConciergeError } from "../domain/errors";

export interface ConciergeConfig {
  readonly groqApiKey: string;
  readonly groqModel: string;
  readonly rateLimit: number;
  readonly rateWindowSeconds: number;
  /** Override the upstream chat-completions URL. Defaults to Groq.
   *  Set to https://openrouter.ai/api/v1/chat/completions for OpenRouter. */
  readonly llmEndpoint: string | undefined;
  readonly llmReferer: string | undefined;
  readonly llmTitle: string | undefined;
}

interface EnvSource {
  readonly env: Readonly<Record<string, string | undefined>>;
}

/**
 * Read configuration from an arbitrary env source. We don't reach for
 * `process.env` directly so this is trivially testable.
 */
export function loadConciergeConfig({ env }: EnvSource): ConciergeConfig {
  const apiKey = env["GROQ_API_KEY"]?.trim();
  if (!apiKey) {
    throw new ConciergeError(
      "GROQ_API_KEY is required to run the concierge endpoint",
      "missing_config",
    );
  }
  const model = env["GROQ_MODEL"]?.trim() || "openai/gpt-oss-120b";
  const rateLimit = positiveInt(env["CONCIERGE_RATE_LIMIT"], 20);
  const rateWindowSeconds = positiveInt(env["CONCIERGE_RATE_WINDOW_SECONDS"], 60);
  const llmEndpoint = env["LLM_BASE_URL"]?.trim() || undefined;
  const llmReferer = env["PUBLIC_SITE_URL"]?.trim() || undefined;
  const llmTitle = env["LLM_TITLE"]?.trim() || "Maison Fwurtz";
  return {
    groqApiKey: apiKey,
    groqModel: model,
    rateLimit,
    rateWindowSeconds,
    llmEndpoint,
    llmReferer,
    llmTitle,
  };
}

function positiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
