export type DocumentType = "devis" | "facture";
export type DocumentStatus = "brouillon" | "envoye" | "accepte" | "paye" | "retard" | "perdu";

export const DOCUMENT_TYPES: ReadonlyArray<DocumentType> = ["devis", "facture"];
export const DOCUMENT_STATUSES: ReadonlyArray<DocumentStatus> = [
  "brouillon", "envoye", "accepte", "paye", "retard", "perdu",
];

export const STATUS_LABELS: Readonly<Record<DocumentStatus, string>> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  accepte: "Accepté",
  paye: "Payé",
  retard: "En retard",
  perdu: "Perdu",
};

export interface DocumentLine {
  label: string;
  qty: number;
  unitPriceCents: number;
}

export interface FwDocument {
  id: string;
  type: DocumentType;
  number: string;
  clientId: string;
  status: DocumentStatus;
  amountHtCents: number;
  amountTtcCents: number;
  vatRateBps: number;
  lines: DocumentLine[];
  notes: string | null;
  emittedAt: string | null;
  dueAt: string | null;
  sentAt: string | null;
  paidAt: string | null;
  pdfPath: string | null;
  stripePaymentLink: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewDocument {
  type: DocumentType;
  clientId: string;
  status?: DocumentStatus | undefined;
  vatRateBps?: number | undefined;
  lines?: DocumentLine[] | undefined;
  notes?: string | null | undefined;
  emittedAt?: string | null | undefined;
  dueAt?: string | null | undefined;
}

export interface UpdateDocument {
  status?: DocumentStatus | undefined;
  lines?: DocumentLine[] | undefined;
  vatRateBps?: number | undefined;
  notes?: string | null | undefined;
  emittedAt?: string | null | undefined;
  dueAt?: string | null | undefined;
  sentAt?: string | null | undefined;
  paidAt?: string | null | undefined;
  stripePaymentLink?: string | null | undefined;
}

export function calcTotals(lines: DocumentLine[], vatRateBps: number): { ht: number; ttc: number } {
  const ht = lines.reduce((s, l) => s + Math.round(l.qty * l.unitPriceCents), 0);
  const ttc = Math.round(ht * (1 + vatRateBps / 10000));
  return { ht, ttc };
}

export function formatEur(cents: number): string {
  const euros = cents / 100;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(euros);
}
