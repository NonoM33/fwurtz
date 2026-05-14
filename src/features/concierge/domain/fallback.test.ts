import { describe, it, expect } from "vitest";
import { fallbackReply } from "./fallback";

describe("fallbackReply", () => {
  it("steers price questions toward a 30-minute call (the conversion play)", () => {
    expect(fallbackReply("Combien ça coûte ?").toLowerCase()).toMatch(/30 minutes|cr[eé]neau/);
    expect(fallbackReply("quel est votre tarif").toLowerCase()).toMatch(/30 minutes|cr[eé]neau/);
  });

  it("offers a lead-capture path for explicit RDV requests", () => {
    expect(fallbackReply("Je voudrais un rendez-vous").toLowerCase()).toContain("coordonnées");
  });

  it("frames juridique without giving any precise legal advice", () => {
    const reply = fallbackReply("J'ai besoin d'aide pour un contrat");
    expect(reply.toLowerCase()).toMatch(/avocat|orienter/);
  });

  it("falls back to a curious follow-up question for off-topic input", () => {
    const reply = fallbackReply("bonjour");
    expect(reply.toLowerCase()).toContain("plus");
  });

  it("matches accent-insensitive variants of the same intent", () => {
    expect(fallbackReply("rendez-vous")).toEqual(fallbackReply("rendezvous"));
  });
});
