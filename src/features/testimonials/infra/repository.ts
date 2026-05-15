import { randomUUID } from "node:crypto";
import { db } from "~/shared/db/db.ts";
import { ensureMigrated } from "~/shared/db/migrate.ts";
import type {
  NewTestimonial,
  Testimonial,
  UpdateTestimonial,
} from "../domain/types.ts";

interface Row {
  id: string;
  author_name: string;
  author_role: string | null;
  author_org: string | null;
  quote: string;
  rating: number;
  position: number;
  featured: number;
  published: number;
  client_id: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

function rowToEntity(r: Row): Testimonial {
  return {
    id: r.id,
    authorName: r.author_name,
    authorRole: r.author_role,
    authorOrg: r.author_org,
    quote: r.quote,
    rating: r.rating,
    position: r.position,
    featured: r.featured === 1,
    published: r.published === 1,
    clientId: r.client_id,
    source: r.source,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export class TestimonialsRepository {
  constructor() {
    ensureMigrated();
  }

  list(filter: { publishedOnly?: boolean; limit?: number } = {}): Testimonial[] {
    const where = filter.publishedOnly ? "WHERE published = 1" : "";
    const limit = filter.limit ? `LIMIT ${Math.max(1, Math.min(filter.limit, 200))}` : "";
    const rows = db()
      .prepare<unknown[], Row>(
        `SELECT * FROM testimonials ${where} ORDER BY featured DESC, position ASC, created_at DESC ${limit}`,
      )
      .all() as Row[];
    return rows.map(rowToEntity);
  }

  get(id: string): Testimonial | null {
    const row = db()
      .prepare<unknown[], Row>("SELECT * FROM testimonials WHERE id = ?")
      .get(id) as Row | undefined;
    return row ? rowToEntity(row) : null;
  }

  create(input: NewTestimonial): Testimonial {
    const id = randomUUID();
    const now = new Date().toISOString();
    db()
      .prepare(
        `INSERT INTO testimonials
          (id, author_name, author_role, author_org, quote, rating, position, featured, published, client_id, source, created_at, updated_at)
         VALUES (@id, @authorName, @authorRole, @authorOrg, @quote, @rating, @position, @featured, @published, @clientId, @source, @createdAt, @updatedAt)`,
      )
      .run({
        id,
        authorName: input.authorName.trim(),
        authorRole: input.authorRole?.trim() || null,
        authorOrg: input.authorOrg?.trim() || null,
        quote: input.quote.trim(),
        rating: clampRating(input.rating ?? 5),
        position: input.position ?? 999,
        featured: input.featured ? 1 : 0,
        published: input.published ? 1 : 0,
        clientId: input.clientId ?? null,
        source: input.source ?? null,
        createdAt: now,
        updatedAt: now,
      });
    const created = this.get(id);
    if (!created) throw new Error("failed to read back inserted testimonial");
    return created;
  }

  update(id: string, patch: UpdateTestimonial): Testimonial | null {
    const current = this.get(id);
    if (!current) return null;
    const merged: Testimonial = {
      ...current,
      authorName: patch.authorName ?? current.authorName,
      authorRole: patch.authorRole !== undefined ? patch.authorRole : current.authorRole,
      authorOrg: patch.authorOrg !== undefined ? patch.authorOrg : current.authorOrg,
      quote: patch.quote ?? current.quote,
      rating: patch.rating !== undefined ? clampRating(patch.rating) : current.rating,
      position: patch.position ?? current.position,
      featured: patch.featured ?? current.featured,
      published: patch.published ?? current.published,
      updatedAt: new Date().toISOString(),
    };
    db()
      .prepare(
        `UPDATE testimonials SET
            author_name=@authorName, author_role=@authorRole, author_org=@authorOrg,
            quote=@quote, rating=@rating, position=@position,
            featured=@featured, published=@published, updated_at=@updatedAt
         WHERE id=@id`,
      )
      .run({
        id,
        authorName: merged.authorName,
        authorRole: merged.authorRole,
        authorOrg: merged.authorOrg,
        quote: merged.quote,
        rating: merged.rating,
        position: merged.position,
        featured: merged.featured ? 1 : 0,
        published: merged.published ? 1 : 0,
        updatedAt: merged.updatedAt,
      });
    return this.get(id);
  }

  remove(id: string): boolean {
    const r = db().prepare("DELETE FROM testimonials WHERE id = ?").run(id);
    return r.changes > 0;
  }
}

function clampRating(n: number): number {
  if (!Number.isFinite(n)) return 5;
  return Math.max(1, Math.min(5, Math.round(n)));
}

let singleton: TestimonialsRepository | undefined;
export function testimonialsRepo(): TestimonialsRepository {
  if (!singleton) singleton = new TestimonialsRepository();
  return singleton;
}
