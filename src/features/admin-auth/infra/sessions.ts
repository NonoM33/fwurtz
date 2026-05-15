import { createHmac, timingSafeEqual } from "node:crypto";
import type { AdminSession } from "../domain/types.ts";
import { SESSION_TTL_SECONDS } from "../domain/types.ts";

interface AdminConfig {
  email: string;
  password: string;
  secret: string;
}

function envValue(key: string): string | undefined {
  const v =
    (import.meta.env as Record<string, string | undefined>)[key] ??
    process.env[key];
  return v && v.length > 0 ? v : undefined;
}

export function loadAdminConfig(): AdminConfig {
  const email = envValue("ADMIN_EMAIL") ?? "sophie@maison-fwurtz.fr";
  const password = envValue("ADMIN_PASSWORD") ?? "luxe2024";
  const secret =
    envValue("ADMIN_SESSION_SECRET") ??
    "dev-only-secret-change-me-in-production";
  return { email, password, secret };
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function issueSession(email: string): {
  token: string;
  expiresAt: number;
} {
  const cfg = loadAdminConfig();
  const issuedAt = Date.now();
  const expiresAt = issuedAt + SESSION_TTL_SECONDS * 1000;
  const session: AdminSession = { email, issuedAt, expiresAt };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const sig = sign(payload, cfg.secret);
  return { token: `${payload}.${sig}`, expiresAt };
}

export function verifySession(token: string | undefined): AdminSession | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!payload || !sig) return null;
  const cfg = loadAdminConfig();
  const expected = sign(payload, cfg.secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let session: AdminSession;
  try {
    session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as AdminSession;
  } catch {
    return null;
  }
  if (Date.now() > session.expiresAt) return null;
  return session;
}

export function authenticate(email: string, password: string): boolean {
  const cfg = loadAdminConfig();
  if (email.trim().toLowerCase() !== cfg.email.toLowerCase()) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(cfg.password);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
