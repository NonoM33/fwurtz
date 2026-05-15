import { describe, expect, it } from "vitest";
import { decideRoute } from "./role.ts";

describe("decideRoute", () => {
  it("allows everything when role=all", () => {
    for (const p of [
      "/",
      "/services/x",
      "/admin",
      "/admin/dashboard",
      "/api/admin/medias",
      "/api/image-slots/x",
      "/api/concierge",
    ]) {
      expect(decideRoute("all", p).allow).toBe(true);
    }
  });

  it("site rejects admin & admin-api & media APIs but keeps concierge + assets", () => {
    expect(decideRoute("site", "/admin").allow).toBe(false);
    expect(decideRoute("site", "/admin/dashboard").allow).toBe(false);
    expect(decideRoute("site", "/api/admin/medias").allow).toBe(false);
    expect(decideRoute("site", "/api/image-slots/hero").allow).toBe(false);
    expect(decideRoute("site", "/api/media/x").allow).toBe(false);
    expect(decideRoute("site", "/api/concierge").allow).toBe(true);
    expect(decideRoute("site", "/").allow).toBe(true);
    expect(decideRoute("site", "/services/x").allow).toBe(true);
    expect(decideRoute("site", "/favicon.svg").allow).toBe(true);
    expect(decideRoute("site", "/_astro/foo.js").allow).toBe(true);
  });

  it("admin only serves admin pages + admin api + media (for thumbnails)", () => {
    expect(decideRoute("admin", "/admin").allow).toBe(true);
    expect(decideRoute("admin", "/admin/facturation").allow).toBe(true);
    expect(decideRoute("admin", "/api/admin/medias").allow).toBe(true);
    expect(decideRoute("admin", "/api/media/abc").allow).toBe(true);
    expect(decideRoute("admin", "/api/image-slots/hero").allow).toBe(true);
    expect(decideRoute("admin", "/").allow).toBe(false);
    expect(decideRoute("admin", "/services/x").allow).toBe(false);
    expect(decideRoute("admin", "/api/concierge").allow).toBe(false);
  });

  it("api serves only public read endpoints + concierge, never admin", () => {
    expect(decideRoute("api", "/api/image-slots/hero").allow).toBe(true);
    expect(decideRoute("api", "/api/media/abc").allow).toBe(true);
    expect(decideRoute("api", "/api/concierge").allow).toBe(true);
    expect(decideRoute("api", "/api/admin/medias").allow).toBe(false);
    expect(decideRoute("api", "/admin").allow).toBe(false);
    expect(decideRoute("api", "/").allow).toBe(false);
  });
});
