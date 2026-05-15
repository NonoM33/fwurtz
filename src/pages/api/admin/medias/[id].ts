import type { APIRoute } from "astro";
import { mediaStorage } from "@features/media/infra/storage.ts";
import { MediaError } from "@features/media/domain/errors.ts";

export const prerender = false;

export const DELETE: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) return json({ error: "missing_id" }, 400);
  try {
    await mediaStorage().remove(id);
    return json({ ok: true });
  } catch (err) {
    if (err instanceof MediaError && err.code === "not_found") {
      return json({ error: "not_found" }, 404);
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
