import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authenticate, issueSession, verifySession } from "./sessions.ts";

describe("admin-auth sessions", () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env.ADMIN_EMAIL = "ada@example.com";
    process.env.ADMIN_PASSWORD = "lovelace";
    process.env.ADMIN_SESSION_SECRET = "test-secret-test-secret-test-secret";
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it("issues a session that round-trips through verifySession", () => {
    const { token } = issueSession("ada@example.com");
    const session = verifySession(token);
    expect(session?.email).toBe("ada@example.com");
  });

  it("rejects a tampered session payload", () => {
    const { token } = issueSession("ada@example.com");
    const parts = token.split(".");
    const payload = parts[0]!;
    const sig = parts[1]!;
    const malicious = `${payload.slice(0, -1)}A.${sig}`;
    expect(verifySession(malicious)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const { token } = issueSession("ada@example.com");
    process.env.ADMIN_SESSION_SECRET = "different-secret-different-secret";
    expect(verifySession(token)).toBeNull();
  });

  it("rejects a malformed token", () => {
    expect(verifySession(undefined)).toBeNull();
    expect(verifySession("")).toBeNull();
    expect(verifySession("not.a.token")).toBeNull();
    expect(verifySession("missing-dot")).toBeNull();
  });

  it("authenticates the configured admin", () => {
    expect(authenticate("ada@example.com", "lovelace")).toBe(true);
    expect(authenticate("ADA@EXAMPLE.COM", "lovelace")).toBe(true);
  });

  it("rejects wrong password (regression: must be constant-time-safe)", () => {
    expect(authenticate("ada@example.com", "wrong")).toBe(false);
    expect(authenticate("ada@example.com", "lovelaceX")).toBe(false);
    expect(authenticate("not-admin@example.com", "lovelace")).toBe(false);
  });
});
