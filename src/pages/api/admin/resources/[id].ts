import type { APIRoute } from "astro";
import { resourcesRepo } from "@features/resources/infra/repository.ts";
import { RESOURCE_TYPES } from "@features/resources/domain/types.ts";
import type { ResourceType } from "@features/resources/domain/types.ts";

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
  const type = typeof body.type === "string" && RESOURCE_TYPES.includes(body.type as ResourceType)
    ? (body.type as ResourceType) : undefined;
  const meta = (typeof body.bodyJson === "object" && body.bodyJson !== null)
    ? (body.bodyJson as Record<string, unknown>) : undefined;

  const updated = resourcesRepo().update(id, {
    slug: typeof body.slug === "string" ? body.slug : undefined,
    type,
    title: typeof body.title === "string" ? body.title : undefined,
    summary: typeof body.summary === "string" ? body.summary : undefined,
    bodyJson: meta,
    linkUrl: body.linkUrl === null || typeof body.linkUrl === "string" ? (body.linkUrl as string | null) : undefined,
    coverImageSlot: body.coverImageSlot === null || typeof body.coverImageSlot === "string"
      ? (body.coverImageSlot as string | null) : undefined,
    captureEmail: typeof body.captureEmail === "boolean" ? body.captureEmail : undefined,
    position: typeof body.position === "number" ? body.position : undefined,
    published: typeof body.published === "boolean" ? body.published : undefined,
  });
  if (!updated) return json({ error: "not_found" }, 404);
  return json({ resource: updated });
};

export const DELETE: APIRoute = ({ params }) => {
  const id = params.id;
  if (!id) return json({ error: "missing_id" }, 400);
  return resourcesRepo().remove(id) ? json({ ok: true }) : json({ error: "not_found" }, 404);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
