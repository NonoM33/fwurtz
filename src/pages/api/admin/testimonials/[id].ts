import type { APIRoute } from "astro";
import { testimonialsRepo } from "@features/testimonials/infra/repository.ts";

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
  const updated = testimonialsRepo().update(id, {
    authorName: typeof body.authorName === "string" ? body.authorName : undefined,
    authorRole: body.authorRole === null || typeof body.authorRole === "string"
      ? (body.authorRole as string | null) : undefined,
    authorOrg: body.authorOrg === null || typeof body.authorOrg === "string"
      ? (body.authorOrg as string | null) : undefined,
    quote: typeof body.quote === "string" ? body.quote : undefined,
    rating: typeof body.rating === "number" ? body.rating : undefined,
    position: typeof body.position === "number" ? body.position : undefined,
    featured: typeof body.featured === "boolean" ? body.featured : undefined,
    published: typeof body.published === "boolean" ? body.published : undefined,
  });
  if (!updated) return json({ error: "not_found" }, 404);
  return json({ testimonial: updated });
};

export const DELETE: APIRoute = ({ params }) => {
  const id = params.id;
  if (!id) return json({ error: "missing_id" }, 400);
  const ok = testimonialsRepo().remove(id);
  return ok ? json({ ok: true }) : json({ error: "not_found" }, 404);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
