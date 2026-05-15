import { randomUUID } from "node:crypto";
import { db } from "~/shared/db/db.ts";
import { ensureMigrated } from "~/shared/db/migrate.ts";
import type {
  Client,
  ClientSource,
  ClientStage,
  NewClient,
  UpdateClient,
} from "../domain/types.ts";
import { CLIENT_SOURCES, CLIENT_STAGES } from "../domain/types.ts";

interface Row {
  id: string;
  name: string;
  org: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  stage: string;
  score: number;
  owner_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function rowToEntity(r: Row): Client {
  return {
    id: r.id,
    name: r.name,
    org: r.org,
    email: r.email,
    phone: r.phone,
    source: (CLIENT_SOURCES.includes(r.source as ClientSource) ? r.source : "autre") as ClientSource,
    stage: (CLIENT_STAGES.includes(r.stage as ClientStage) ? r.stage : "prospect") as ClientStage,
    score: r.score,
    ownerId: r.owner_id,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export class ClientsRepository {
  constructor() {
    ensureMigrated();
  }

  list(filter: { stage?: ClientStage; q?: string } = {}): Client[] {
    const clauses: string[] = [];
    const params: Record<string, unknown> = {};
    if (filter.stage) {
      clauses.push("stage = @stage");
      params["stage"] = filter.stage;
    }
    if (filter.q && filter.q.trim()) {
      clauses.push("(name LIKE @q OR org LIKE @q OR email LIKE @q)");
      params["q"] = `%${filter.q.trim()}%`;
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = db()
      .prepare<unknown[], Row>(
        `SELECT * FROM clients ${where} ORDER BY updated_at DESC`,
      )
      .all(params) as Row[];
    return rows.map(rowToEntity);
  }

  get(id: string): Client | null {
    const row = db().prepare<unknown[], Row>("SELECT * FROM clients WHERE id = ?").get(id) as Row | undefined;
    return row ? rowToEntity(row) : null;
  }

  countByStage(): Readonly<Record<ClientStage, number>> {
    const rows = db()
      .prepare<unknown[], { stage: string; n: number }>("SELECT stage, COUNT(*) as n FROM clients GROUP BY stage")
      .all() as { stage: string; n: number }[];
    const out: Record<ClientStage, number> = {
      prospect: 0, qualified: 0, meeting: 0, proposal: 0, client: 0, lost: 0,
    };
    for (const r of rows) {
      if (CLIENT_STAGES.includes(r.stage as ClientStage)) {
        out[r.stage as ClientStage] = r.n;
      }
    }
    return out;
  }

  create(input: NewClient): Client {
    const id = randomUUID();
    const now = new Date().toISOString();
    db()
      .prepare(
        `INSERT INTO clients (id, name, org, email, phone, source, stage, score, owner_id, notes, created_at, updated_at)
         VALUES (@id, @name, @org, @email, @phone, @source, @stage, @score, @ownerId, @notes, @createdAt, @updatedAt)`,
      )
      .run({
        id,
        name: input.name.trim(),
        org: input.org?.trim() || null,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        source: input.source ?? "autre",
        stage: input.stage ?? "prospect",
        score: input.score ?? 0,
        ownerId: input.ownerId ?? null,
        notes: input.notes ?? null,
        createdAt: now,
        updatedAt: now,
      });
    const created = this.get(id);
    if (!created) throw new Error("failed to read back inserted client");
    return created;
  }

  update(id: string, patch: UpdateClient): Client | null {
    const current = this.get(id);
    if (!current) return null;
    const merged: Client = {
      ...current,
      name: patch.name ?? current.name,
      org: patch.org !== undefined ? patch.org : current.org,
      email: patch.email !== undefined ? patch.email : current.email,
      phone: patch.phone !== undefined ? patch.phone : current.phone,
      source: patch.source ?? current.source,
      stage: patch.stage ?? current.stage,
      score: patch.score ?? current.score,
      ownerId: patch.ownerId !== undefined ? patch.ownerId : current.ownerId,
      notes: patch.notes !== undefined ? patch.notes : current.notes,
      updatedAt: new Date().toISOString(),
    };
    db()
      .prepare(
        `UPDATE clients SET
            name=@name, org=@org, email=@email, phone=@phone,
            source=@source, stage=@stage, score=@score, owner_id=@ownerId,
            notes=@notes, updated_at=@updatedAt
         WHERE id=@id`,
      )
      .run({
        id,
        name: merged.name,
        org: merged.org,
        email: merged.email,
        phone: merged.phone,
        source: merged.source,
        stage: merged.stage,
        score: merged.score,
        ownerId: merged.ownerId,
        notes: merged.notes,
        updatedAt: merged.updatedAt,
      });
    return this.get(id);
  }

  remove(id: string): boolean {
    return db().prepare("DELETE FROM clients WHERE id = ?").run(id).changes > 0;
  }
}

let singleton: ClientsRepository | undefined;
export function clientsRepo(): ClientsRepository {
  if (!singleton) singleton = new ClientsRepository();
  return singleton;
}
