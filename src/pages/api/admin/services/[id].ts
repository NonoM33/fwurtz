import type { APIRoute } from "astro";
import { servicesRepo } from "@features/services/infra/repository.ts";

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request }) => {
  const id = params.id;
  if (!id) return json({ error: "missing_id" }, 400);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid_payload" }, 400);
  }
  const updated = servicesRepo().update(id, {
    slug: typeof body.slug === "string" ? body.slug : undefined,
    title: typeof body.title === "string" ? body.title : undefined,
    summary: typeof body.summary === "string" ? body.summary : undefined,
    icon: body.icon === null || typeof body.icon === "string" ? (body.icon as string | null) : undefined,
    heroImageSlot: body.heroImageSlot === null || typeof body.heroImageSlot === "string"
      ? (body.heroImageSlot as string | null) : undefined,
    position: typeof body.position === "number" ? body.position : undefined,
    published: typeof body.published === "boolean" ? body.published : undefined,
  });
  if (!updated) return json({ error: "not_found" }, 404);
  return json({ service: updated });
};

export const DELETE: APIRoute = ({ params }) => {
  const id = params.id;
  if (!id) return json({ error: "missing_id" }, 400);
  return servicesRepo().remove(id) ? json({ ok: true }) : json({ error: "not_found" }, 404);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
