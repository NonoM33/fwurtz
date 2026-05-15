export type ClientSource = "conciergerie" | "formulaire" | "telephone" | "recommandation" | "autre";
export type ClientStage = "prospect" | "qualified" | "meeting" | "proposal" | "client" | "lost";

export const CLIENT_SOURCES: ReadonlyArray<ClientSource> = [
  "conciergerie",
  "formulaire",
  "telephone",
  "recommandation",
  "autre",
];
export const CLIENT_STAGES: ReadonlyArray<ClientStage> = [
  "prospect",
  "qualified",
  "meeting",
  "proposal",
  "client",
  "lost",
];

export const STAGE_LABELS: Readonly<Record<ClientStage, string>> = {
  prospect: "Nouveau prospect",
  qualified: "Qualifié",
  meeting: "Rendez-vous",
  proposal: "Proposition",
  client: "Client",
  lost: "Perdu",
};

export interface Client {
  id: string;
  name: string;
  org: string | null;
  email: string | null;
  phone: string | null;
  source: ClientSource;
  stage: ClientStage;
  score: number;
  ownerId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewClient {
  name: string;
  org?: string | null | undefined;
  email?: string | null | undefined;
  phone?: string | null | undefined;
  source?: ClientSource | undefined;
  stage?: ClientStage | undefined;
  score?: number | undefined;
  ownerId?: string | null | undefined;
  notes?: string | null | undefined;
}

export interface UpdateClient {
  name?: string | undefined;
  org?: string | null | undefined;
  email?: string | null | undefined;
  phone?: string | null | undefined;
  source?: ClientSource | undefined;
  stage?: ClientStage | undefined;
  score?: number | undefined;
  ownerId?: string | null | undefined;
  notes?: string | null | undefined;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}
