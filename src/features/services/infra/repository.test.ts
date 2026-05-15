import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeDb } from "~/shared/db/db.ts";
import { ServicesRepository } from "./repository.ts";
import { slugify } from "../domain/types.ts";

describe("ServicesRepository", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mf-svc-"));
    process.env.DB_PATH = join(dir, "db.sqlite");
    closeDb();
  });

  afterEach(() => {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
    delete process.env.DB_PATH;
  });

  it("creates, reads by slug, updates, deletes", () => {
    const repo = new ServicesRepository();
    const created = repo.create({
      slug: "test",
      title: "Test",
      summary: "A summary",
      published: true,
      position: 1,
    });
    expect(created.slug).toBe("test");
    expect(repo.bySlug("test")?.id).toBe(created.id);
    const updated = repo.update(created.id, { summary: "Updated", position: 2 });
    expect(updated?.summary).toBe("Updated");
    expect(updated?.position).toBe(2);
    expect(repo.remove(created.id)).toBe(true);
  });

  it("publishedOnly excludes drafts (regression: drafts visible on home was a bug)", () => {
    const repo = new ServicesRepository();
    repo.create({ slug: "drafty", title: "Drafty", summary: "x", published: false });
    const visible = repo.list({ publishedOnly: true });
    expect(visible.find((s) => s.slug === "drafty")).toBeUndefined();
    const all = repo.list();
    expect(all.find((s) => s.slug === "drafty")).toBeDefined();
  });

  it("seed migration provides 6 published services", () => {
    const repo = new ServicesRepository();
    const visible = repo.list({ publishedOnly: true });
    expect(visible.length).toBeGreaterThanOrEqual(6);
    expect(visible.find((s) => s.slug === "creation-sites-web")).toBeDefined();
  });

  it("returns null on missing id", () => {
    const repo = new ServicesRepository();
    expect(repo.get("nope")).toBeNull();
    expect(repo.update("nope", { title: "x" })).toBeNull();
    expect(repo.remove("nope")).toBe(false);
  });

  it("slugify strips accents, lowercases, collapses non-alnum", () => {
    expect(slugify("Création de Sites Web")).toBe("creation-de-sites-web");
    expect(slugify("  Hello World  ")).toBe("hello-world");
    expect(slugify("Événementiel & coordination")).toBe("evenementiel-coordination");
    expect(slugify("Apport d'affaires")).toBe("apport-d-affaires");
  });
});
