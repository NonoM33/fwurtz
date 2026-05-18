/**
 * Pure types used by the concierge widget (presentation layer).
 *
 * All AI/business logic lives in `maison-core` and is consumed via `@maison/sdk`;
 * this file only carries the shapes the local widget needs to render and to call
 * the `/api/concierge` proxy.
 */

export type Role = "user" | "concierge";

export interface Message {
  readonly role: Role;
  readonly text: string;
}

/** Internal page categories that drive a context-aware greeting in the widget. */
export type PageContext =
  | "accueil"
  | "services"
  | "sites-web"
  | "gestion"
  | "juridique"
  | "evenementiel"
  | "apropos"
  | "processus"
  | "contact"
  | "ressources";
