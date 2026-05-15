import { randomUUID } from "node:crypto";
import { db } from "~/shared/db/db.ts";
import { ensureMigrated } from "~/shared/db/migrate.ts";
import type {
  DocumentLine,
  DocumentStatus,
  DocumentType,
  FwDocument,
  NewDocument,
  UpdateDocument,
} from "../domain/types.ts";
import {
  DOCUMENT_STATUSES,
  DOCUMENT_TYPES,
  calcTotals,
} from "../domain/types.ts";

interface Row {
  id: string;
  type: string;
  number: string;
  client_id: string;
  status: string;
  amount_ht_cents: number;
  amount_ttc_cents: number;
  vat_rate: number;
  lines_json: string;
  notes: string | null;
  emitted_at: string | null;
  due_at: string | null;
  sent_at: string | null;
  paid_at: string | null;
  pdf_path: string | null;
  stripe_payment_link: string | null;
  created_at: string;
  updated_at: string;
}

function parseLines(s: string): DocumentLine[] {
  try {
    const arr = JSON.parse(s);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x): x is { label?: string; qty?: number; unitPriceCents?: number } =>
        typeof x === "object" && x !== null,
      )
      .map((x) => ({
        label: String(x.label ?? "").trim(),
        qty: Number(x.qty ?? 1),
        unitPriceCents: Number(x.unitPriceCents ?? 0),
      }));
  } catch {
    return [];
  }
}

function rowToEntity(r: Row): FwDocument {
  return {
    id: r.id,
    type: (DOCUMENT_TYPES.includes(r.type as DocumentType) ? r.type : "devis") as DocumentType,
    number: r.number,
    clientId: r.client_id,
    status: (DOCUMENT_STATUSES.includes(r.status as DocumentStatus) ? r.status : "brouillon") as DocumentStatus,
    amountHtCents: r.amount_ht_cents,
    amountTtcCents: r.amount_ttc_cents,
    vatRateBps: r.vat_rate,
    lines: parseLines(r.lines_json),
    notes: r.notes,
    emittedAt: r.emitted_at,
    dueAt: r.due_at,
    sentAt: r.sent_at,
    paidAt: r.paid_at,
    pdfPath: r.pdf_path,
    stripePaymentLink: r.stripe_payment_link,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function nextNumber(type: DocumentType, year: number): string {
  const prefix = type === "devis" ? "DEV" : "FAC";
  const like = `${prefix}-${year}-%`;
  const row = db()
    .prepare<unknown[], { max: string | null }>(
      "SELECT MAX(number) as max FROM documents WHERE number LIKE ?",
    )
    .get(like) as { max: string | null } | undefined;
  let next = 1;
  if (row?.max) {
    const lastSeq = Number.parseInt(row.max.split("-").pop() ?? "0", 10);
    if (Number.isFinite(lastSeq)) next = lastSeq + 1;
  }
  return `${prefix}-${year}-${String(next).padStart(4, "0")}`;
}

export class DocumentsRepository {
  constructor() {
    ensureMigrated();
  }

  list(filter: { type?: DocumentType; status?: DocumentStatus; clientId?: string } = {}): FwDocument[] {
    const clauses: string[] = [];
    const params: Record<string, unknown> = {};
    if (filter.type) {
      clauses.push("type = @type");
      params["type"] = filter.type;
    }
    if (filter.status) {
      clauses.push("status = @status");
      params["status"] = filter.status;
    }
    if (filter.clientId) {
      clauses.push("client_id = @clientId");
      params["clientId"] = filter.clientId;
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = db()
      .prepare<unknown[], Row>(
        `SELECT * FROM documents ${where} ORDER BY (emitted_at IS NULL), emitted_at DESC, created_at DESC`,
      )
      .all(params) as Row[];
    return rows.map(rowToEntity);
  }

  get(id: string): FwDocument | null {
    const row = db().prepare<unknown[], Row>("SELECT * FROM documents WHERE id = ?").get(id) as Row | undefined;
    return row ? rowToEntity(row) : null;
  }

  create(input: NewDocument): FwDocument {
    const id = randomUUID();
    const year = new Date().getFullYear();
    const number = nextNumber(input.type, year);
    const lines = input.lines ?? [];
    const vatRateBps = input.vatRateBps ?? 2000;
    const { ht, ttc } = calcTotals(lines, vatRateBps);
    const now = new Date().toISOString();
    db()
      .prepare(
        `INSERT INTO documents
          (id, type, number, client_id, status, amount_ht_cents, amount_ttc_cents,
           vat_rate, lines_json, notes, emitted_at, due_at, created_at, updated_at)
         VALUES (@id, @type, @number, @clientId, @status, @ht, @ttc,
                 @vatRate, @lines, @notes, @emittedAt, @dueAt, @createdAt, @updatedAt)`,
      )
      .run({
        id,
        type: input.type,
        number,
        clientId: input.clientId,
        status: input.status ?? "brouillon",
        ht, ttc,
        vatRate: vatRateBps,
        lines: JSON.stringify(lines),
        notes: input.notes ?? null,
        emittedAt: input.emittedAt ?? null,
        dueAt: input.dueAt ?? null,
        createdAt: now,
        updatedAt: now,
      });
    const created = this.get(id);
    if (!created) throw new Error("failed to read back inserted document");
    return created;
  }

  update(id: string, patch: UpdateDocument): FwDocument | null {
    const current = this.get(id);
    if (!current) return null;
    const lines = patch.lines ?? current.lines;
    const vatRateBps = patch.vatRateBps ?? current.vatRateBps;
    const { ht, ttc } = calcTotals(lines, vatRateBps);
    const merged: FwDocument = {
      ...current,
      status: patch.status ?? current.status,
      lines,
      vatRateBps,
      amountHtCents: ht,
      amountTtcCents: ttc,
      notes: patch.notes !== undefined ? patch.notes : current.notes,
      emittedAt: patch.emittedAt !== undefined ? patch.emittedAt : current.emittedAt,
      dueAt: patch.dueAt !== undefined ? patch.dueAt : current.dueAt,
      sentAt: patch.sentAt !== undefined ? patch.sentAt : current.sentAt,
      paidAt: patch.paidAt !== undefined ? patch.paidAt : current.paidAt,
      stripePaymentLink: patch.stripePaymentLink !== undefined ? patch.stripePaymentLink : current.stripePaymentLink,
      updatedAt: new Date().toISOString(),
    };
    db()
      .prepare(
        `UPDATE documents SET
            status=@status, amount_ht_cents=@ht, amount_ttc_cents=@ttc,
            vat_rate=@vatRate, lines_json=@lines, notes=@notes,
            emitted_at=@emittedAt, due_at=@dueAt, sent_at=@sentAt, paid_at=@paidAt,
            stripe_payment_link=@stripeLink, updated_at=@updatedAt
         WHERE id=@id`,
      )
      .run({
        id,
        status: merged.status,
        ht: merged.amountHtCents,
        ttc: merged.amountTtcCents,
        vatRate: merged.vatRateBps,
        lines: JSON.stringify(merged.lines),
        notes: merged.notes,
        emittedAt: merged.emittedAt,
        dueAt: merged.dueAt,
        sentAt: merged.sentAt,
        paidAt: merged.paidAt,
        stripeLink: merged.stripePaymentLink,
        updatedAt: merged.updatedAt,
      });
    return this.get(id);
  }

  remove(id: string): boolean {
    return db().prepare("DELETE FROM documents WHERE id = ?").run(id).changes > 0;
  }

  totals(): { encaisses: number; en_attente: number; en_retard: number; devis_envoyes: number } {
    const all = this.list();
    return {
      encaisses: all.filter((d) => d.status === "paye").reduce((s, d) => s + d.amountTtcCents, 0),
      en_attente: all.filter((d) => d.type === "facture" && (d.status === "envoye" || d.status === "accepte")).reduce((s, d) => s + d.amountTtcCents, 0),
      en_retard: all.filter((d) => d.status === "retard").reduce((s, d) => s + d.amountTtcCents, 0),
      devis_envoyes: all.filter((d) => d.type === "devis" && d.status === "envoye").length,
    };
  }
}

let singleton: DocumentsRepository | undefined;
export function documentsRepo(): DocumentsRepository {
  if (!singleton) singleton = new DocumentsRepository();
  return singleton;
}
