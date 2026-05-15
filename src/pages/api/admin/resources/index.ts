import type { APIRoute } from "astro";
import { resourcesRepo } from "@features/resources/infra/repository.ts";
import { RESOURCE_TYPES } from "@features/resources/domain/types.ts";
import type { ResourceType } from "@features/resources/domain/types.ts";
import { slugify } from "@features/services/domain/types.ts";

export const prerender = false;

export const GET: APIRoute = () => json({ resources: resourcesRepo().list() });

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid_payload" }, 400);
  }
  const title = String(body.title ?? "").trim();
  const summary = String(body.summary ?? "").trim();
  const type = String(body.type ?? "ebook") as ResourceType;
  if (!title || !summary) return json({ error: "missing_fields" }, 400);
  if (!RESOURCE_TYPES.includes(type)) return json({ error: "invalid_type" }, 400);

  const slug = String(body.slug ?? "").trim() || slugify(title);
  if (resourcesRepo().bySlug(slug)) return json({ error: "slug_taken" }, 409);

  const meta = (typeof body.bodyJson === "object" && body.bodyJson !== null)
    ? (body.bodyJson as Record<string, unknown>) : undefined;

  const created = resourcesRepo().create({
    slug,
    title,
    summary,
    type,
    bodyJson: meta,
    linkUrl: typeof body.linkUrl === "string" ? body.linkUrl : undefined,
    coverImageSlot: typeof body.coverImageSlot === "string" ? body.coverImageSlot : undefined,
    captureEmail: body.captureEmail === true,
    position: typeof body.position === "number" ? body.position : undefined,
    published: body.published === true,
  });
  return json({ resource: created }, 201);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
