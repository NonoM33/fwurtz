import type { APIRoute } from "astro";
import { documentsRepo } from "@features/documents/infra/repository.ts";
import { DOCUMENT_TYPES, DOCUMENT_STATUSES } from "@features/documents/domain/types.ts";
import type { DocumentLine, DocumentStatus, DocumentType } from "@features/documents/domain/types.ts";
import { clientsRepo } from "@features/clients/infra/repository.ts";

export const prerender = false;

export const GET: APIRoute = ({ url }) => {
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status");
  const clientId = url.searchParams.get("clientId");
  const filter: { type?: DocumentType; status?: DocumentStatus; clientId?: string } = {};
  if (type && DOCUMENT_TYPES.includes(type as DocumentType)) filter.type = type as DocumentType;
  if (status && DOCUMENT_STATUSES.includes(status as DocumentStatus)) filter.status = status as DocumentStatus;
  if (clientId) filter.clientId = clientId;
  return json({ documents: documentsRepo().list(filter) });
};

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid_payload" }, 400);
  }
  const type = String(body.type ?? "") as DocumentType;
  const clientId = String(body.clientId ?? "").trim();
  if (!DOCUMENT_TYPES.includes(type)) return json({ error: "invalid_type" }, 400);
  if (!clientId) return json({ error: "missing_client" }, 400);
  if (!clientsRepo().get(clientId)) return json({ error: "client_not_found" }, 404);

  const lines: DocumentLine[] = Array.isArray(body.lines)
    ? body.lines.filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null).map((x) => ({
        label: String(x.label ?? "").trim(),
        qty: Number(x.qty ?? 1),
        unitPriceCents: Math.round(Number(x.unitPriceCents ?? 0)),
      }))
    : [];

  const created = documentsRepo().create({
    type,
    clientId,
    vatRateBps: typeof body.vatRateBps === "number" ? body.vatRateBps : undefined,
    lines,
    notes: typeof body.notes === "string" ? body.notes : null,
    emittedAt: typeof body.emittedAt === "string" ? body.emittedAt : null,
    dueAt: typeof body.dueAt === "string" ? body.dueAt : null,
  });
  return json({ document: created }, 201);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
