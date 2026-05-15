import type { APIRoute } from "astro";
import { clientsRepo } from "@features/clients/infra/repository.ts";
import { CLIENT_SOURCES, CLIENT_STAGES } from "@features/clients/domain/types.ts";
import type { ClientSource, ClientStage } from "@features/clients/domain/types.ts";

export const prerender = false;

export const GET: APIRoute = ({ params }) => {
  const id = params.id;
  if (!id) return json({ error: "missing_id" }, 400);
  const c = clientsRepo().get(id);
  if (!c) return json({ error: "not_found" }, 404);
  return json({ client: c });
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
  const source = typeof body.source === "string" && CLIENT_SOURCES.includes(body.source as ClientSource)
    ? (body.source as ClientSource) : undefined;
  const stage = typeof body.stage === "string" && CLIENT_STAGES.includes(body.stage as ClientStage)
    ? (body.stage as ClientStage) : undefined;

  const updated = clientsRepo().update(id, {
    name: typeof body.name === "string" ? body.name : undefined,
    org: body.org === null || typeof body.org === "string" ? (body.org as string | null) : undefined,
    email: body.email === null || typeof body.email === "string" ? (body.email as string | null) : undefined,
    phone: body.phone === null || typeof body.phone === "string" ? (body.phone as string | null) : undefined,
    source,
    stage,
    score: typeof body.score === "number" ? body.score : undefined,
    notes: body.notes === null || typeof body.notes === "string" ? (body.notes as string | null) : undefined,
  });
  if (!updated) return json({ error: "not_found" }, 404);
  return json({ client: updated });
};

export const DELETE: APIRoute = ({ params }) => {
  const id = params.id;
  if (!id) return json({ error: "missing_id" }, 400);
  return clientsRepo().remove(id) ? json({ ok: true }) : json({ error: "not_found" }, 404);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
