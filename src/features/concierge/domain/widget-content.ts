/**
 * UI content for the concierge widget — strings, greetings, fallback texts.
 *
 * IMPORTANT (technical debt, tracked):
 *   These strings are tenant-specific content ("Marie", Maison Fwurtz tone, etc.)
 *   that should live in `tenant.conciergeConfig.widget` on `maison-core` so the
 *   platform can serve any tenant without recompiling the widget. Until then,
 *   they sit here as inline content.
 */

import type { PageContext } from "./types";

export const CONCIERGE_NAME = "Marie";

const GREETINGS: Record<PageContext, string> = {
  accueil:
    "Bonsoir — je suis Marie, votre interlocutrice chez Maison Fwurtz. Que puis-je faire pour vous ce soir ?",
  services:
    "Vous explorez nos savoir-faire ✦ Une question particulière sur l'un de nos domaines ?",
  apropos: "Ravie de votre visite. Souhaitez-vous en savoir plus sur ma façon de travailler ?",
  processus: "Le processus vous intéresse ? Je peux vous l'expliquer pas à pas, à votre rythme.",
  contact: "Vous souhaitez nous écrire ? Je peux peut-être déjà répondre à votre question.",
  ressources:
    "Curieux de nos e-books ? Je peux vous orienter vers celui qui correspond à votre besoin.",
  "sites-web": "Vous pensez à un site ? Parlons de ce que vous avez en tête.",
  gestion:
    "Beaucoup de tâches admin à déléguer ? Voyons comment on peut alléger votre quotidien.",
  juridique: "Une question juridique ? Je ne suis pas avocate, mais je peux vous orienter.",
  evenementiel:
    "Un événement à organiser ? Mariage, lancement, réception privée — dites-m'en plus.",
};

export function greetingFor(page: PageContext): string {
  return GREETINGS[page];
}

/** Map a URL path to a `PageContext`. */
export function detectPage(pathname: string): PageContext {
  const p = pathname.toLowerCase();
  if (p.includes("creation-sites")) return "sites-web";
  if (p.includes("gestion-administrative")) return "gestion";
  if (p.includes("accompagnement-juridique")) return "juridique";
  if (p.includes("evenementiel")) return "evenementiel";
  if (p.includes("services")) return "services";
  if (p.includes("a-propos")) return "apropos";
  if (p.includes("processus")) return "processus";
  if (p.includes("contact")) return "contact";
  if (p.includes("ressources")) return "ressources";
  return "accueil";
}

/**
 * Client-side fallback shown only when the proxy returns an error AND
 * the SDK couldn't recover. The platform-level fallback (LLM down)
 * already returns a polite message via `metadata.fallback=true`.
 *
 * The `_input` argument is accepted for backwards-compatibility with the
 * previous keyword-based fallback. We now intentionally return a single
 * polite message — pattern matching belongs to the platform.
 */
export function fallbackReply(_input?: string): string {
  return "Désolée, je suis momentanément indisponible. N'hésitez pas à me réécrire dans quelques instants — ou à laisser vos coordonnées via le formulaire de contact.";
}
