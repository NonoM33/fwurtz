import type { ConciergeReply, ConciergeReplyRequest, LLMClient, Message } from "../domain/types";
import { ConciergeError } from "../domain/errors";
import { SYSTEM_PROMPT } from "../domain/prompt";
import { fallbackReply } from "../domain/fallback";

interface Dependencies {
  readonly llm: LLMClient;
}

/**
 * Use case: take a visitor's conversation history, ask the LLM for Marie's
 * next reply. Falls back to a keyword-based response when the upstream is
 * unreachable, so the conversation never dies in front of a prospect.
 */
export function makeReplyToVisitor(deps: Dependencies) {
  return async function replyToVisitor(req: ConciergeReplyRequest): Promise<ConciergeReply> {
    if (req.history.length === 0) {
      throw new ConciergeError("history cannot be empty", "invalid_input");
    }

    const lastUserMessage = lastMessageFromUser(req.history);
    try {
      const text = await deps.llm.complete({
        systemPrompt: SYSTEM_PROMPT,
        history: req.history,
      });
      const trimmed = text.trim();
      if (!trimmed) return { text: fallbackReply(lastUserMessage) };
      return { text: trimmed };
    } catch (err) {
      if (err instanceof ConciergeError && err.code === "rate_limited") throw err;
      if (err instanceof ConciergeError && err.code === "missing_config") throw err;
      // Surface upstream failures in server logs so they don't disappear
      // behind the visitor-facing fallback reply.
      const code = err instanceof ConciergeError ? err.code : "unknown";
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[concierge] upstream failed (${code}): ${message}`);
      return { text: fallbackReply(lastUserMessage) };
    }
  };
}

function lastMessageFromUser(history: readonly Message[]): string {
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m && m.role === "user") return m.text;
  }
  return "";
}
