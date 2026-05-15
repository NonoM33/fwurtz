import { randomUUID } from "node:crypto";
import { db } from "~/shared/db/db.ts";
import { ensureMigrated } from "~/shared/db/migrate.ts";
import type {
  NewResource,
  Resource,
  ResourceMeta,
  ResourceType,
  UpdateResource,
} from "../domain/types.ts";
import { RESOURCE_TYPES } from "../domain/types.ts";

interface Row {
  id: string;
  slug: string;
  type: string;
  title: string;
  summary: string;
  body_json: string | null;
  file_path: string | null;
  link_url: string | null;
  cover_image_slot: string | null;
  capture_email: number;
  downloads_count: number;
  position: number;
  published: number;
  created_at: string;
  updated_at: string;
}

function parseMeta(s: string | null): ResourceMeta {
  if (!s) return {};
  try {
    const parsed = JSON.parse(s);
    return typeof parsed === "object" && parsed !== null ? (parsed as ResourceMeta) : {};
  } catch {
    return {};
  }
}

function rowToEntity(r: Row): Resource {
  return {
    id: r.id,
    slug: r.slug,
    type: (RESOURCE_TYPES.includes(r.type as ResourceType) ? r.type : "autre") as ResourceType,
    title: r.title,
    summary: r.summary,
    bodyJson: parseMeta(r.body_json),
    filePath: r.file_path,
    linkUrl: r.link_url,
    coverImageSlot: r.cover_image_slot,
    captureEmail: r.capture_email === 1,
    downloadsCount: r.downloads_count,
    position: r.position,
    published: r.published === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export class ResourcesRepository {
  constructor() {
    ensureMigrated();
  }

  list(filter: { publishedOnly?: boolean; type?: ResourceType } = {}): Resource[] {
    const clauses: string[] = [];
    const params: Record<string, unknown> = {};
    if (filter.publishedOnly) clauses.push("published = 1");
    if (filter.type) {
      clauses.push("type = @type");
      params["type"] = filter.type;
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = db()
      .prepare<unknown[], Row>(
        `SELECT * FROM resources ${where} ORDER BY position ASC, title ASC`,
      )
      .all(params) as Row[];
    return rows.map(rowToEntity);
  }

  get(id: string): Resource | null {
    const row = db().prepare<unknown[], Row>("SELECT * FROM resources WHERE id = ?").get(id) as Row | undefined;
    return row ? rowToEntity(row) : null;
  }

  bySlug(slug: string): Resource | null {
    const row = db().prepare<unknown[], Row>("SELECT * FROM resources WHERE slug = ?").get(slug) as Row | undefined;
    return row ? rowToEntity(row) : null;
  }

  create(input: NewResource): Resource {
    const id = randomUUID();
    const now = new Date().toISOString();
    db()
      .prepare(
        `INSERT INTO resources
          (id, slug, type, title, summary, body_json, file_path, link_url, cover_image_slot,
           capture_email, downloads_count, position, published, created_at, updated_at)
         VALUES (@id, @slug, @type, @title, @summary, @bodyJson, @filePath, @linkUrl,
                 @coverImageSlot, @captureEmail, 0, @position, @published, @createdAt, @updatedAt)`,
      )
      .run({
        id,
        slug: input.slug.trim(),
        type: input.type,
        title: input.title.trim(),
        summary: input.summary.trim(),
        bodyJson: JSON.stringify(input.bodyJson ?? {}),
        filePath: input.filePath ?? null,
        linkUrl: input.linkUrl ?? null,
        coverImageSlot: input.coverImageSlot ?? null,
        captureEmail: input.captureEmail ? 1 : 0,
        position: input.position ?? 999,
        published: input.published ? 1 : 0,
        createdAt: now,
        updatedAt: now,
      });
    const created = this.get(id);
    if (!created) throw new Error("failed to read back inserted resource");
    return created;
  }

  update(id: string, patch: UpdateResource): Resource | null {
    const current = this.get(id);
    if (!current) return null;
    const merged: Resource = {
      ...current,
      slug: patch.slug ?? current.slug,
      type: patch.type ?? current.type,
      title: patch.title ?? current.title,
      summary: patch.summary ?? current.summary,
      bodyJson: patch.bodyJson ?? current.bodyJson,
      filePath: patch.filePath !== undefined ? patch.filePath : current.filePath,
      linkUrl: patch.linkUrl !== undefined ? patch.linkUrl : current.linkUrl,
      coverImageSlot: patch.coverImageSlot !== undefined ? patch.coverImageSlot : current.coverImageSlot,
      captureEmail: patch.captureEmail ?? current.captureEmail,
      position: patch.position ?? current.position,
      published: patch.published ?? current.published,
      updatedAt: new Date().toISOString(),
    };
    db()
      .prepare(
        `UPDATE resources SET
            slug=@slug, type=@type, title=@title, summary=@summary,
            body_json=@bodyJson, file_path=@filePath, link_url=@linkUrl,
            cover_image_slot=@coverImageSlot, capture_email=@captureEmail,
            position=@position, published=@published, updated_at=@updatedAt
         WHERE id=@id`,
      )
      .run({
        id,
        slug: merged.slug,
        type: merged.type,
        title: merged.title,
        summary: merged.summary,
        bodyJson: JSON.stringify(merged.bodyJson),
        filePath: merged.filePath,
        linkUrl: merged.linkUrl,
        coverImageSlot: merged.coverImageSlot,
        captureEmail: merged.captureEmail ? 1 : 0,
        position: merged.position,
        published: merged.published ? 1 : 0,
        updatedAt: merged.updatedAt,
      });
    return this.get(id);
  }

  remove(id: string): boolean {
    return db().prepare("DELETE FROM resources WHERE id = ?").run(id).changes > 0;
  }

  trackDownload(id: string): void {
    db().prepare("UPDATE resources SET downloads_count = downloads_count + 1 WHERE id = ?").run(id);
  }
}

let singleton: ResourcesRepository | undefined;
export function resourcesRepo(): ResourcesRepository {
  if (!singleton) singleton = new ResourcesRepository();
  return singleton;
}
