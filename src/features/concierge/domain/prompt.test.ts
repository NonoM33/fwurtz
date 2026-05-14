import { describe, it, expect } from "vitest";
import { detectPage, greetingFor, CONCIERGE_NAME, SYSTEM_PROMPT } from "./prompt";

describe("detectPage", () => {
  it("maps service sub-pages to their narrow context", () => {
    expect(detectPage("/services/creation-sites-web")).toBe("sites-web");
    expect(detectPage("/services/gestion-administrative")).toBe("gestion");
    expect(detectPage("/services/accompagnement-juridique")).toBe("juridique");
    expect(detectPage("/services/evenementiel")).toBe("evenementiel");
  });

  it("maps the services hub to 'services' (not a sub-page)", () => {
    expect(detectPage("/services")).toBe("services");
    expect(detectPage("/services/")).toBe("services");
  });

  it("maps standalone informational pages", () => {
    expect(detectPage("/a-propos")).toBe("apropos");
    expect(detectPage("/processus")).toBe("processus");
    expect(detectPage("/contact")).toBe("contact");
    expect(detectPage("/ressources")).toBe("ressources");
  });

  it("defaults unknown paths to 'accueil'", () => {
    expect(detectPage("/")).toBe("accueil");
    expect(detectPage("/whatever")).toBe("accueil");
    expect(detectPage("")).toBe("accueil");
  });

  it("is case-insensitive", () => {
    expect(detectPage("/Services")).toBe("services");
    expect(detectPage("/A-Propos")).toBe("apropos");
  });
});

describe("greetingFor", () => {
  it("returns a localized French greeting for each context", () => {
    for (const ctx of [
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
    ] as const) {
      const greeting = greetingFor(ctx);
      expect(greeting.length).toBeGreaterThan(20);
      expect(greeting).toMatch(/[a-zA-ZéèàùçôîâÉÈÀÙÇÔÎÂ]/);
    }
  });

  it("frames the juridique page as orientation, not legal advice", () => {
    expect(greetingFor("juridique").toLowerCase()).toContain("avocate");
  });
});

describe("SYSTEM_PROMPT", () => {
  it("names Marie and forbids the 'startup' vocabulary in the brand", () => {
    expect(SYSTEM_PROMPT).toContain(CONCIERGE_NAME);
    expect(SYSTEM_PROMPT).toContain("écosystème");
    expect(SYSTEM_PROMPT).toContain("leverage");
    expect(SYSTEM_PROMPT).toContain("plateforme");
  });

  it("lists the only two firm prices the concierge may quote", () => {
    expect(SYSTEM_PROMPT).toContain("500€");
    expect(SYSTEM_PROMPT).toContain("25€/mois");
  });

  it("requires the concierge to never admit being an AI", () => {
    expect(SYSTEM_PROMPT).toMatch(/Ne dis jamais que tu es une IA/);
  });
});
