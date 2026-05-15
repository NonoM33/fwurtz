import { randomUUID } from "node:crypto";
import { db } from "~/shared/db/db.ts";
import { ensureMigrated } from "~/shared/db/migrate.ts";
import type { NewSitePage, PageBlocks, SitePage, UpdateSitePage } from "../domain/types.ts";

interface Row {
  id: string;
  slug: string;
  title: string;
  blocks_json: string;
  draft_blocks_json: string | null;
  meta_description: string | null;
  published_at: string | null;
  updated_at: string;
}

function parseBlocks(s: string | null): PageBlocks {
  if (!s) return {};
  try {
    const parsed = JSON.parse(s);
    return typeof parsed === "object" && parsed !== null ? (parsed as PageBlocks) : {};
  } catch {
    return {};
  }
}

function rowToEntity(r: Row): SitePage {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    blocks: parseBlocks(r.blocks_json),
    draftBlocks: r.draft_blocks_json ? parseBlocks(r.draft_blocks_json) : null,
    metaDescription: r.meta_description,
    publishedAt: r.published_at,
    updatedAt: r.updated_at,
  };
}

export class PagesRepository {
  constructor() {
    ensureMigrated();
  }

  list(): SitePage[] {
    const rows = db().prepare<unknown[], Row>("SELECT * FROM pages ORDER BY slug ASC").all() as Row[];
    return rows.map(rowToEntity);
  }

  get(id: string): SitePage | null {
    const row = db().prepare<unknown[], Row>("SELECT * FROM pages WHERE id = ?").get(id) as Row | undefined;
    return row ? rowToEntity(row) : null;
  }

  bySlug(slug: string): SitePage | null {
    const row = db().prepare<unknown[], Row>("SELECT * FROM pages WHERE slug = ?").get(slug) as Row | undefined;
    return row ? rowToEntity(row) : null;
  }

  create(input: NewSitePage): SitePage {
    const id = randomUUID();
    const now = new Date().toISOString();
    db()
      .prepare(
        `INSERT INTO pages (id, slug, title, blocks_json, draft_blocks_json, meta_description, published_at, updated_at)
         VALUES (@id, @slug, @title, @blocks, NULL, @meta, @publishedAt, @now)`,
      )
      .run({
        id,
        slug: input.slug.trim(),
        title: input.title.trim(),
        blocks: JSON.stringify(input.blocks ?? {}),
        meta: input.metaDescription ?? null,
        publishedAt: now,
        now,
      });
    const created = this.get(id);
    if (!created) throw new Error("failed to read back inserted page");
    return created;
  }

  update(id: string, patch: UpdateSitePage): SitePage | null {
    const current = this.get(id);
    if (!current) return null;
    const now = new Date().toISOString();
    const merged = {
      title: patch.title ?? current.title,
      blocks: patch.publish === true ? (patch.draftBlocks ?? current.draftBlocks ?? current.blocks) : current.blocks,
      draftBlocks: patch.publish === true ? null : (patch.draftBlocks !== undefined ? patch.draftBlocks : current.draftBlocks),
      metaDescription: patch.metaDescription !== undefined ? patch.metaDescription : current.metaDescription,
      publishedAt: patch.publish === true ? now : current.publishedAt,
    };
    db()
      .prepare(
        `UPDATE pages SET
            title=@title,
            blocks_json=@blocks,
            draft_blocks_json=@draft,
            meta_description=@meta,
            published_at=@publishedAt,
            updated_at=@now
         WHERE id=@id`,
      )
      .run({
        id,
        title: merged.title,
        blocks: JSON.stringify(merged.blocks),
        draft: merged.draftBlocks ? JSON.stringify(merged.draftBlocks) : null,
        meta: merged.metaDescription,
        publishedAt: merged.publishedAt,
        now,
      });
    return this.get(id);
  }
}

let singleton: PagesRepository | undefined;
export function pagesRepo(): PagesRepository {
  if (!singleton) singleton = new PagesRepository();
  return singleton;
}
