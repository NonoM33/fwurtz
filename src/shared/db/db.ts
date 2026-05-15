/**
 * SQLite connection singleton.
 *
 * One file-backed database per process. The path is read from `DB_PATH`
 * (default `./data/db.sqlite`) — mount this directory as a Coolify volume
 * in production so the DB survives container redeploys.
 *
 * WAL mode is enabled for better read concurrency. Foreign keys ON.
 */
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

let instance: Database.Database | undefined;

function envValue(key: string): string | undefined {
  const v =
    (import.meta.env as Record<string, string | undefined>)[key] ??
    process.env[key];
  return v && v.length > 0 ? v : undefined;
}

export function db(): Database.Database {
  if (instance) return instance;
  const path = envValue("DB_PATH") ?? "./data/db.sqlite";
  mkdirSync(dirname(path), { recursive: true });
  const conn = new Database(path);
  conn.pragma("journal_mode = WAL");
  conn.pragma("foreign_keys = ON");
  conn.pragma("synchronous = NORMAL");
  instance = conn;
  return instance;
}

export function closeDb(): void {
  if (instance) {
    instance.close();
    instance = undefined;
  }
}
