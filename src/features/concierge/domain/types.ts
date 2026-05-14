/**
 * Concierge domain — pure types. No I/O, no framework.
 */

export type Role = "user" | "concierge";

export interface Message {
  readonly role: Role;
  readonly text: string;
}

/** Internal page categories that drive a context-aware greeting. */
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

export interface ConciergeReplyRequest {
  readonly history: readonly Message[];
  readonly page: PageContext;
}

export interface ConciergeReply {
  readonly text: string;
}

/** Side-effect-free contract for any LLM provider. */
export interface LLMClient {
  complete(input: {
    readonly systemPrompt: string;
    readonly history: readonly Message[];
  }): Promise<string>;
}
