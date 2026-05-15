import type { APIRoute } from "astro";
import { documentsRepo } from "@features/documents/infra/repository.ts";
import { DOCUMENT_STATUSES } from "@features/documents/domain/types.ts";
import type { DocumentLine, DocumentStatus } from "@features/documents/domain/types.ts";

export const prerender = false;

export const GET: APIRoute = ({ params }) => {
  const id = params.id;
  if (!id) return json({ error: "missing_id" }, 400);
  const d = documentsRepo().get(id);
  if (!d) return json({ error: "not_found" }, 404);
  return json({ document: d });
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
  const status = typeof body.status === "string" && DOCUMENT_STATUSES.includes(body.status as DocumentStatus)
    ? (body.status as DocumentStatus) : undefined;
  const lines: DocumentLine[] | undefined = Array.isArray(body.lines)
    ? body.lines.filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null).map((x) => ({
        label: String(x.label ?? "").trim(),
        qty: Number(x.qty ?? 1),
        unitPriceCents: Math.round(Number(x.unitPriceCents ?? 0)),
      }))
    : undefined;

  const updated = documentsRepo().update(id, {
    status,
    lines,
    vatRateBps: typeof body.vatRateBps === "number" ? body.vatRateBps : undefined,
    notes: body.notes === null || typeof body.notes === "string" ? (body.notes as string | null) : undefined,
    emittedAt: body.emittedAt === null || typeof body.emittedAt === "string" ? (body.emittedAt as string | null) : undefined,
    dueAt: body.dueAt === null || typeof body.dueAt === "string" ? (body.dueAt as string | null) : undefined,
    sentAt: body.sentAt === null || typeof body.sentAt === "string" ? (body.sentAt as string | null) : undefined,
    paidAt: body.paidAt === null || typeof body.paidAt === "string" ? (body.paidAt as string | null) : undefined,
    stripePaymentLink: body.stripePaymentLink === null || typeof body.stripePaymentLink === "string"
      ? (body.stripePaymentLink as string | null) : undefined,
  });
  if (!updated) return json({ error: "not_found" }, 404);
  return json({ document: updated });
};

export const DELETE: APIRoute = ({ params }) => {
  const id = params.id;
  if (!id) return json({ error: "missing_id" }, 400);
  return documentsRepo().remove(id) ? json({ ok: true }) : json({ error: "not_found" }, 404);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
