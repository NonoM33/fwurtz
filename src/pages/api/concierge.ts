import type { APIRoute } from "astro";
import { ChatRequestSchema } from "@features/concierge/domain/validation";
import { ConciergeError } from "@features/concierge/domain/errors";
import { getConciergeServices } from "@features/concierge/infra/composition";
import { conversationsRepo } from "@features/conversations/infra/repository.ts";

export const prerender = false;

function clientKey(req: Request, clientAddress: string | undefined): string {
  if (clientAddress) return clientAddress;
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("cf-connecting-ip") ?? "unknown";
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
}

const TAKEN_OVER_REPLY =
  "Merci, votre message vient d'arriver. Notre équipe vous répond dans les meilleurs délais — vous pouvez fermer cette fenêtre, vous serez notifié dès qu'on aura un retour.";

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = ChatRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse(
      { error: "invalid_input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { history, sessionId } = parsed.data;

  // Persist the visitor's message into the conversation log if a session id
  // was provided. We never let logging crash the visitor experience, so the
  // try/catch swallows DB errors silently.
  let conversationStatus: "ouvert" | "en_cours" | "clos" = "ouvert";
  if (sessionId) {
    try {
      const conv = conversationsRepo().upsert({ id: sessionId, channel: "concierge" });
      conversationStatus = conv.status;
      const lastUser = [...history].reverse().find((m) => m.role === "user");
      if (lastUser) {
        // Avoid double-logging if the same text is the most recent in DB.
        const existing = conversationsRepo().messages(sessionId, { limit: 1 });
        const newest = existing.length > 0 ? existing[existing.length - 1] : undefined;
        const isDuplicate = newest && newest.direction === "in" && newest.body === lastUser.text;
        if (!isDuplicate) {
          conversationsRepo().appendMessage({
            conversationId: sessionId,
            direction: "in",
            author: "visitor",
            body: lastUser.text,
          });
        }
      }
    } catch {
      /* logging failure should never break the visitor flow */
    }
  }

  // If a human took over, hold the LLM and serve a holding reply. The
  // admin's manual replies are pulled by the widget via /api/concierge/poll.
  if (conversationStatus === "en_cours" || conversationStatus === "clos") {
    return jsonResponse({ text: TAKEN_OVER_REPLY });
  }

  let services: ReturnType<typeof getConciergeServices>;
  try {
    services = getConciergeServices(process.env);
  } catch (err) {
    if (err instanceof ConciergeError && err.code === "missing_config") {
      return jsonResponse({ error: "missing_config" }, { status: 503 });
    }
    return jsonResponse({ error: "internal_error" }, { status: 500 });
  }

  const key = clientKey(request, clientAddress);
  if (!services.rateLimiter.tryAcquire(key)) {
    return jsonResponse({ error: "rate_limited" }, { status: 429 });
  }

  try {
    const reply = await services.replyToVisitor(parsed.data);
    if (sessionId) {
      try {
        conversationsRepo().appendMessage({
          conversationId: sessionId,
          direction: "out",
          author: "marie",
          body: reply.text,
        });
      } catch {
        /* logging only */
      }
    }
    return jsonResponse({ text: reply.text });
  } catch (err) {
    if (err instanceof ConciergeError && err.code === "rate_limited") {
      return jsonResponse({ error: "rate_limited" }, { status: 429 });
    }
    if (err instanceof ConciergeError && err.code === "upstream_unauthorized") {
      return jsonResponse({ error: "upstream_unauthorized" }, { status: 502 });
    }
    return jsonResponse({ error: "internal_error" }, { status: 500 });
  }
};

export const GET: APIRoute = () =>
  jsonResponse({ error: "method_not_allowed" }, { status: 405 });
