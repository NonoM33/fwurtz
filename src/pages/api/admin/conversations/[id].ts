import type { APIRoute } from "astro";
import { conversationsRepo } from "@features/conversations/infra/repository.ts";
import { STATUSES } from "@features/conversations/domain/types.ts";
import type { ConversationStatus } from "@features/conversations/domain/types.ts";

export const prerender = false;

export const GET: APIRoute = ({ params, url }) => {
  const id = params.id;
  if (!id) return json({ error: "missing_id" }, 400);
  const conv = conversationsRepo().get(id);
  if (!conv) return json({ error: "not_found" }, 404);
  const messages = conversationsRepo().messages(id, { limit: 200 });
  if (url.searchParams.get("markRead") === "1") {
    conversationsRepo().markAllRead(id);
  }
  return json({ conversation: conv, messages });
};

export const PATCH: APIRoute = async ({ params, request }) => {
  const id = params.id;
  if (!id) return json({ error: "missing_id" }, 400);
  let body: { status?: string };
  try {
    body = (await request.json()) as { status?: string };
  } catch {
    return json({ error: "invalid_payload" }, 400);
  }
  const status = body.status;
  if (!status || !STATUSES.includes(status as ConversationStatus)) {
    return json({ error: "invalid_status" }, 400);
  }
  const updated = conversationsRepo().setStatus(id, status as ConversationStatus);
  if (!updated) return json({ error: "not_found" }, 404);
  return json({ conversation: updated });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
