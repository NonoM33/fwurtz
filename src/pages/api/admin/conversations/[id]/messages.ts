import type { APIRoute } from "astro";
import { conversationsRepo } from "@features/conversations/infra/repository.ts";

export const prerender = false;

export const POST: APIRoute = async ({ params, request, locals }) => {
  const id = params.id;
  if (!id) return json({ error: "missing_id" }, 400);
  const conv = conversationsRepo().get(id);
  if (!conv) return json({ error: "not_found" }, 404);
  let body: { text?: string };
  try {
    body = (await request.json()) as { text?: string };
  } catch {
    return json({ error: "invalid_payload" }, 400);
  }
  const text = (body.text ?? "").trim();
  if (!text) return json({ error: "empty_message" }, 400);
  const author = locals.adminEmail ?? "admin";
  const message = conversationsRepo().appendMessage({
    conversationId: id,
    direction: "out",
    author,
    body: text,
  });
  return json({ message }, 201);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
