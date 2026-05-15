import type { APIRoute } from "astro";
import { clientsRepo } from "@features/clients/infra/repository.ts";
import { CLIENT_SOURCES, CLIENT_STAGES } from "@features/clients/domain/types.ts";
import type { ClientSource, ClientStage } from "@features/clients/domain/types.ts";

export const prerender = false;

export const GET: APIRoute = ({ url }) => {
  const stage = url.searchParams.get("stage");
  const q = url.searchParams.get("q") ?? undefined;
  const filter: { stage?: ClientStage; q?: string } = {};
  if (stage && CLIENT_STAGES.includes(stage as ClientStage)) filter.stage = stage as ClientStage;
  if (q) filter.q = q;
  return json({ clients: clientsRepo().list(filter) });
};

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid_payload" }, 400);
  }
  const name = String(body.name ?? "").trim();
  if (!name) return json({ error: "missing_name" }, 400);
  const source = typeof body.source === "string" && CLIENT_SOURCES.includes(body.source as ClientSource)
    ? (body.source as ClientSource) : undefined;
  const stage = typeof body.stage === "string" && CLIENT_STAGES.includes(body.stage as ClientStage)
    ? (body.stage as ClientStage) : undefined;

  const created = clientsRepo().create({
    name,
    org: typeof body.org === "string" ? body.org : null,
    email: typeof body.email === "string" ? body.email : null,
    phone: typeof body.phone === "string" ? body.phone : null,
    source,
    stage,
    score: typeof body.score === "number" ? body.score : undefined,
    notes: typeof body.notes === "string" ? body.notes : null,
  });
  return json({ client: created }, 201);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
