import { describe, expect, it } from "vitest";
import { buildClearCookie, buildSessionCookie, readSessionCookie } from "./cookies.ts";

describe("session cookies", () => {
  it("builds a cookie with the expected security flags in dev", () => {
    delete process.env.NODE_ENV;
    const cookie = buildSessionCookie("abc123");
    expect(cookie).toContain("mf_admin=abc123");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).not.toContain("Secure");
  });

  it("builds a Secure cookie in production", () => {
    process.env.NODE_ENV = "production";
    expect(buildSessionCookie("abc")).toContain("Secure");
    delete process.env.NODE_ENV;
  });

  it("clears the cookie", () => {
    const c = buildClearCookie();
    expect(c).toContain("mf_admin=");
    expect(c).toContain("Max-Age=0");
  });

  it("reads the session cookie out of a Cookie header", () => {
    expect(readSessionCookie(null)).toBeUndefined();
    expect(readSessionCookie("")).toBeUndefined();
    expect(readSessionCookie("foo=bar")).toBeUndefined();
    expect(readSessionCookie("mf_admin=abc")).toBe("abc");
    expect(readSessionCookie("foo=bar; mf_admin=abc; baz=qux")).toBe("abc");
    expect(readSessionCookie("mf_admin=a=b=c")).toBe("a=b=c");
  });
});
