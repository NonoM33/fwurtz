import type { APIRoute } from "astro";
import { mediaStorage } from "@features/media/infra/storage.ts";
import { MediaError } from "@features/media/domain/errors.ts";

export const prerender = false;

export const GET: APIRoute = async () => {
  const slots = await mediaStorage().listSlots();
  return json({ slots });
};

export const PUT: APIRoute = async ({ request }) => {
  let body: { slotId?: string; mediaId?: string; alt?: string };
  try {
    body = (await request.json()) as {
      slotId?: string;
      mediaId?: string;
      alt?: string;
    };
  } catch {
    return json({ error: "invalid_payload" }, 400);
  }
  const slotId = (body.slotId ?? "").trim();
  const mediaId = (body.mediaId ?? "").trim();
  if (!slotId || !mediaId) {
    return json({ error: "missing_fields" }, 400);
  }
  try {
    const assignment = await mediaStorage().assignSlot(slotId, mediaId, body.alt);
    return json({ assignment });
  } catch (err) {
    if (err instanceof MediaError && err.code === "not_found") {
      return json({ error: "media_not_found" }, 404);
    }
    return json({ error: "internal_error" }, 500);
  }
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
