import { describe, expect, it } from "vitest";
import {
  CONCIERGE_NAME,
  detectPage,
  fallbackReply,
  greetingFor,
} from "./widget-content";

describe("CONCIERGE_NAME", () => {
  it("exposes Marie as the concierge persona name", () => {
    expect(CONCIERGE_NAME).toBe("Marie");
  });
});

describe("detectPage", () => {
  it.each([
    ["/creation-sites/", "sites-web"],
    ["/gestion-administrative", "gestion"],
    ["/accompagnement-juridique", "juridique"],
    ["/evenementiel", "evenementiel"],
    ["/services", "services"],
    ["/a-propos", "apropos"],
    ["/processus", "processus"],
    ["/contact", "contact"],
    ["/ressources", "ressources"],
  ])("maps %s -> %s", (path, expected) => {
    expect(detectPage(path)).toBe(expected);
  });

  it.each([["/"], ["/unknown-page"], [""], ["/blog/foo"]])(
    "falls back to 'accueil' for %s",
    (path) => {
      expect(detectPage(path)).toBe("accueil");
    },
  );

  it("is case-insensitive on the path", () => {
    expect(detectPage("/Services")).toBe("services");
    expect(detectPage("/CREATION-SITES/x")).toBe("sites-web");
  });
});

describe("greetingFor", () => {
  it("returns a non-empty greeting for every page context", () => {
    const pages = [
      "accueil",
      "services",
      "sites-web",
      "gestion",
      "juridique",
      "evenementiel",
      "apropos",
      "processus",
      "contact",
      "ressources",
    ] as const;
    for (const page of pages) {
      const text = greetingFor(page);
      expect(typeof text).toBe("string");
      expect(text.length).toBeGreaterThan(0);
    }
  });

  it("the accueil greeting mentions Marie", () => {
    expect(greetingFor("accueil")).toContain("Marie");
  });
});

describe("fallbackReply", () => {
  it("returns a polite unavailability message", () => {
    const text = fallbackReply();
    expect(text).toContain("momentanément indisponible");
  });

  it("ignores its input argument (kept for backwards-compat)", () => {
    expect(fallbackReply("anything")).toBe(fallbackReply());
    expect(fallbackReply()).toBe(fallbackReply(undefined));
  });
});
