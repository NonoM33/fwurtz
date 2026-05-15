import type { APIRoute } from "astro";
import { pagesRepo } from "@features/pages/infra/repository.ts";

export const prerender = false;

export const GET: APIRoute = ({ params }) => {
  const id = params.id;
  if (!id) return json({ error: "missing_id" }, 400);
  const page = pagesRepo().get(id);
  if (!page) return json({ error: "not_found" }, 404);
  return json({ page });
};

export const PATCH: APIRoute = async ({ params, request }) => {
  const id = params.id;
  if (!id) return json({ error: "missing_id" }, 400);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid_payload" }, 400);
  }
  const updated = pagesRepo().update(id, {
    title: typeof body.title === "string" ? body.title : undefined,
    metaDescription:
      body.metaDescription === null || typeof body.metaDescription === "string"
        ? (body.metaDescription as string | null)
        : undefined,
    blocks: typeof body.blocks === "object" && body.blocks !== null
      ? (body.blocks as Record<string, unknown>)
      : undefined,
    draftBlocks: typeof body.draftBlocks === "object" && body.draftBlocks !== null
      ? (body.draftBlocks as Record<string, unknown>)
      : (body.draftBlocks === null ? null : undefined),
    publish: typeof body.publish === "boolean" ? body.publish : undefined,
  });
  if (!updated) return json({ error: "not_found" }, 404);
  return json({ page: updated });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
