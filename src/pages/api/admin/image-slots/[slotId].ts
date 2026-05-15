import type { APIRoute } from "astro";
import { mediaStorage } from "@features/media/infra/storage.ts";

export const prerender = false;

export const DELETE: APIRoute = async ({ params }) => {
  const slotId = params.slotId;
  if (!slotId) return json({ error: "missing_slot" }, 400);
  await mediaStorage().clearSlot(slotId);
  return json({ ok: true });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
