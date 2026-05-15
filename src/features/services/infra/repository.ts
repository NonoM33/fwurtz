import { randomUUID } from "node:crypto";
import { db } from "~/shared/db/db.ts";
import { ensureMigrated } from "~/shared/db/migrate.ts";
import type { NewService, Service, UpdateService } from "../domain/types.ts";

interface Row {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body_json: string;
  icon: string | null;
  hero_image_slot: string | null;
  position: number;
  published: number;
  updated_at: string;
}

function parseJson(s: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(s);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function rowToEntity(r: Row): Service {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    bodyJson: parseJson(r.body_json),
    icon: r.icon,
    heroImageSlot: r.hero_image_slot,
    position: r.position,
    published: r.published === 1,
    updatedAt: r.updated_at,
  };
}

export class ServicesRepository {
  constructor() {
    ensureMigrated();
  }

  list(filter: { publishedOnly?: boolean } = {}): Service[] {
    const where = filter.publishedOnly ? "WHERE published = 1" : "";
    const rows = db()
      .prepare<unknown[], Row>(
        `SELECT * FROM services ${where} ORDER BY position ASC, title ASC`,
      )
      .all() as Row[];
    return rows.map(rowToEntity);
  }

  get(id: string): Service | null {
    const row = db()
      .prepare<unknown[], Row>("SELECT * FROM services WHERE id = ?")
      .get(id) as Row | undefined;
    return row ? rowToEntity(row) : null;
  }

  bySlug(slug: string): Service | null {
    const row = db()
      .prepare<unknown[], Row>("SELECT * FROM services WHERE slug = ?")
      .get(slug) as Row | undefined;
    return row ? rowToEntity(row) : null;
  }

  create(input: NewService): Service {
    const id = randomUUID();
    const now = new Date().toISOString();
    db()
      .prepare(
        `INSERT INTO services
          (id, slug, title, summary, body_json, icon, hero_image_slot, position, published, updated_at)
         VALUES (@id, @slug, @title, @summary, @bodyJson, @icon, @heroImageSlot, @position, @published, @updatedAt)`,
      )
      .run({
        id,
        slug: input.slug.trim(),
        title: input.title.trim(),
        summary: input.summary.trim(),
        bodyJson: JSON.stringify(input.bodyJson ?? {}),
        icon: input.icon ?? null,
        heroImageSlot: input.heroImageSlot ?? null,
        position: input.position ?? 999,
        published: input.published ? 1 : 0,
        updatedAt: now,
      });
    const created = this.get(id);
    if (!created) throw new Error("failed to read back inserted service");
    return created;
  }

  update(id: string, patch: UpdateService): Service | null {
    const current = this.get(id);
    if (!current) return null;
    const merged: Service = {
      ...current,
      slug: patch.slug ?? current.slug,
      title: patch.title ?? current.title,
      summary: patch.summary ?? current.summary,
      bodyJson: patch.bodyJson ?? current.bodyJson,
      icon: patch.icon !== undefined ? patch.icon : current.icon,
      heroImageSlot: patch.heroImageSlot !== undefined ? patch.heroImageSlot : current.heroImageSlot,
      position: patch.position ?? current.position,
      published: patch.published ?? current.published,
      updatedAt: new Date().toISOString(),
    };
    db()
      .prepare(
        `UPDATE services SET
            slug=@slug, title=@title, summary=@summary,
            body_json=@bodyJson, icon=@icon, hero_image_slot=@heroImageSlot,
            position=@position, published=@published, updated_at=@updatedAt
         WHERE id=@id`,
      )
      .run({
        id,
        slug: merged.slug,
        title: merged.title,
        summary: merged.summary,
        bodyJson: JSON.stringify(merged.bodyJson),
        icon: merged.icon,
        heroImageSlot: merged.heroImageSlot,
        position: merged.position,
        published: merged.published ? 1 : 0,
        updatedAt: merged.updatedAt,
      });
    return this.get(id);
  }

  remove(id: string): boolean {
    const r = db().prepare("DELETE FROM services WHERE id = ?").run(id);
    return r.changes > 0;
  }
}

let singleton: ServicesRepository | undefined;
export function servicesRepo(): ServicesRepository {
  if (!singleton) singleton = new ServicesRepository();
  return singleton;
}
