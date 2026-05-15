import type { APIRoute } from "astro";
import { mediaStorage } from "@features/media/infra/storage.ts";

export const prerender = false;

export const GET: APIRoute = async ({ params, url }) => {
  const slotId = params.slotId;
  if (!slotId) return json({ error: "missing_slot" }, 400);
  const slot = await mediaStorage().getSlot(slotId);
  if (!slot) return json({ error: "no_assignment" }, 404);
  const mediaUrl = new URL(`/api/media/${slot.mediaId}`, url.origin).pathname;
  return new Response(
    JSON.stringify({ url: mediaUrl, alt: slot.alt }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=30, stale-while-revalidate=300",
      },
    },
  );
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
