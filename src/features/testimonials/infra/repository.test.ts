import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeDb } from "~/shared/db/db.ts";
import { TestimonialsRepository } from "./repository.ts";

describe("TestimonialsRepository", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mf-tmn-"));
    process.env.DB_PATH = join(dir, "db.sqlite");
    closeDb();
  });

  afterEach(() => {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
    delete process.env.DB_PATH;
  });

  it("creates, reads, updates, deletes a testimonial", () => {
    const repo = new TestimonialsRepository();
    const created = repo.create({
      authorName: "Ada Lovelace",
      authorRole: "Mathematician",
      quote: "Quoted",
      rating: 4,
      published: true,
    });
    expect(created.id).toBeTruthy();
    expect(created.published).toBe(true);
    expect(created.rating).toBe(4);

    const fetched = repo.get(created.id);
    expect(fetched?.authorName).toBe("Ada Lovelace");

    const updated = repo.update(created.id, { quote: "Better quote", featured: true });
    expect(updated?.quote).toBe("Better quote");
    expect(updated?.featured).toBe(true);

    const all = repo.list();
    // includes seeded testimonials from migration 0002 + the one we created
    expect(all.length).toBeGreaterThanOrEqual(1);

    expect(repo.remove(created.id)).toBe(true);
    expect(repo.get(created.id)).toBeNull();
  });

  it("publishedOnly filter excludes drafts", () => {
    const repo = new TestimonialsRepository();
    repo.create({ authorName: "Draft Author", quote: "Hidden", published: false });
    const seeded = repo.list();
    const visible = repo.list({ publishedOnly: true });
    expect(visible.every((t) => t.published)).toBe(true);
    expect(visible.length).toBeLessThan(seeded.length);
  });

  it("clamps rating between 1 and 5", () => {
    const repo = new TestimonialsRepository();
    expect(repo.create({ authorName: "X", quote: "Q", rating: 99 }).rating).toBe(5);
    expect(repo.create({ authorName: "Y", quote: "Q", rating: -3 }).rating).toBe(1);
    expect(repo.create({ authorName: "Z", quote: "Q", rating: 3.6 }).rating).toBe(4);
  });

  it("returns null when updating a non-existent testimonial (regression)", () => {
    const repo = new TestimonialsRepository();
    expect(repo.update("does-not-exist", { quote: "x" })).toBeNull();
    expect(repo.remove("does-not-exist")).toBe(false);
  });
});
