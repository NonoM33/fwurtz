/**
 * Tiny migration runner.
 *
 * Migrations are imported as raw strings via Vite's `?raw` suffix, so they
 * get bundled at build time and don't need to be copied into the dist output.
 * Each one is recorded in `_migrations` so it runs exactly once per database.
 */
import { db } from "./db.ts";
import init from "./migrations/0001_init.sql?raw";
import seedTestimonials from "./migrations/0002_seed_testimonials.sql?raw";

interface Migration {
  name: string;
  sql: string;
}

const MIGRATIONS: ReadonlyArray<Migration> = [
  { name: "0001_init.sql", sql: init },
  { name: "0002_seed_testimonials.sql", sql: seedTestimonials },
];

interface MigrationRow {
  name: string;
  applied_at: string;
}

export function runMigrations(): { applied: string[] } {
  const conn = db();
  conn.exec(
    `CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  );
  const already = new Set(
    (
      conn.prepare("SELECT name FROM _migrations").all() as MigrationRow[]
    ).map((r) => r.name),
  );

  const applied: string[] = [];
  for (const m of MIGRATIONS) {
    if (already.has(m.name)) continue;
    const insert = conn.prepare("INSERT INTO _migrations (name) VALUES (?)");
    conn.transaction(() => {
      conn.exec(m.sql);
      insert.run(m.name);
    })();
    applied.push(m.name);
  }
  return { applied };
}

// Track which database file (or in-memory handle id) we've already migrated,
// so tests that swap DB_PATH and call closeDb() between test cases get a
// fresh migration on the new file.
const migratedFor = new WeakSet<object>();

export function ensureMigrated(): void {
  const conn = db();
  if (migratedFor.has(conn)) return;
  migratedFor.add(conn);
  const result = runMigrations();
  if (result.applied.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`[db] applied migrations: ${result.applied.join(", ")}`);
  }
}

export function _resetMigrationCache(): void {
  // No-op: the WeakSet drops entries when the DB handle is garbage collected.
  // Kept for explicit intent in tests if needed.
}
