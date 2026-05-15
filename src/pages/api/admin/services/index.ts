import type { APIRoute } from "astro";
import { servicesRepo } from "@features/services/infra/repository.ts";
import { slugify } from "@features/services/domain/types.ts";

export const prerender = false;

export const GET: APIRoute = () => {
  return json({ services: servicesRepo().list() });
};

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid_payload" }, 400);
  }
  const title = String(body.title ?? "").trim();
  const summary = String(body.summary ?? "").trim();
  if (!title || !summary) return json({ error: "missing_fields" }, 400);

  const slug = String(body.slug ?? "").trim() || slugify(title);
  if (servicesRepo().bySlug(slug)) {
    return json({ error: "slug_taken" }, 409);
  }
  const created = servicesRepo().create({
    slug,
    title,
    summary,
    icon: typeof body.icon === "string" ? body.icon : undefined,
    heroImageSlot: typeof body.heroImageSlot === "string" ? body.heroImageSlot : undefined,
    position: typeof body.position === "number" ? body.position : undefined,
    published: body.published === true,
  });
  return json({ service: created }, 201);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
