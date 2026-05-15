import type { APIRoute } from "astro";
import { conversationsRepo } from "@features/conversations/infra/repository.ts";

export const prerender = false;

/**
 * Visitor widget polls this every few seconds to surface manual replies
 * sent from the back office. Returns only outbound messages from staff
 * since `since` (ISO timestamp the widget sends back from its last poll).
 */
export const GET: APIRoute = ({ url }) => {
  const sessionId = url.searchParams.get("sessionId");
  const since = url.searchParams.get("since") ?? "1970-01-01T00:00:00Z";
  if (!sessionId || sessionId.length < 8) {
    return json({ messages: [], status: null }, 200);
  }
  const conv = conversationsRepo().get(sessionId);
  if (!conv) return json({ messages: [], status: null }, 200);
  const messages = conversationsRepo()
    .pollOutboundSince(sessionId, since)
    .filter((m) => m.author !== "marie"); // skip Marie's own auto-replies; the widget already has those
  return json({
    messages: messages.map((m) => ({
      id: m.id,
      text: m.body,
      author: m.author,
      createdAt: m.createdAt,
    })),
    status: conv.status,
  });
};

function json(body: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
