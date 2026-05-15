import type { FwDocument } from "~/features/documents/domain/types.ts";
import type { Client } from "~/features/clients/domain/types.ts";

export type Urgency = "high" | "med" | "low";

export interface RelanceCandidate {
  id: string;
  document: FwDocument;
  client: Client;
  reason: string;
  daysSince: number;
  urgency: Urgency;
  suggestedTone: "doux" | "neutre" | "ferme";
}

const DAY_MS = 86_400_000;

function daysBetween(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS);
}

/** Compute relance candidates from current documents/clients state.
 *
 *  Rules of thumb (configurable later):
 *    - Devis envoyé depuis ≥ 4 jours = à relancer doucement
 *    - Devis envoyé depuis ≥ 10 jours = relancer fermement
 *    - Facture envoyée depuis ≥ 30 jours non payée = relance neutre
 *    - Facture en statut "retard" = relance ferme + critique
 */
export function computeCandidates(
  documents: ReadonlyArray<FwDocument>,
  clients: ReadonlyArray<Client>,
): RelanceCandidate[] {
  const byClient = new Map(clients.map((c) => [c.id, c]));
  const out: RelanceCandidate[] = [];
  for (const doc of documents) {
    const client = byClient.get(doc.clientId);
    if (!client) continue;
    const referenceDate = doc.sentAt ?? doc.emittedAt ?? doc.createdAt;
    const days = daysBetween(referenceDate);
    if (doc.type === "devis" && doc.status === "envoye") {
      if (days >= 10) {
        out.push({
          id: doc.id,
          document: doc,
          client,
          daysSince: days,
          reason: `Devis envoyé depuis ${days} jours sans réponse`,
          urgency: "high",
          suggestedTone: "ferme",
        });
      } else if (days >= 4) {
        out.push({
          id: doc.id,
          document: doc,
          client,
          daysSince: days,
          reason: `Devis envoyé depuis ${days} jours, idéal pour une relance douce`,
          urgency: "med",
          suggestedTone: "doux",
        });
      }
    } else if (doc.type === "facture") {
      if (doc.status === "retard") {
        out.push({
          id: doc.id,
          document: doc,
          client,
          daysSince: days,
          reason: "Facture en retard, relance comptable nécessaire",
          urgency: "high",
          suggestedTone: "ferme",
        });
      } else if (doc.status === "envoye" && days >= 30) {
        out.push({
          id: doc.id,
          document: doc,
          client,
          daysSince: days,
          reason: `Facture envoyée depuis ${days} jours, paiement à confirmer`,
          urgency: "med",
          suggestedTone: "neutre",
        });
      }
    }
  }
  // sort by urgency then days desc
  const order: Record<Urgency, number> = { high: 0, med: 1, low: 2 };
  return out.sort((a, b) => order[a.urgency] - order[b.urgency] || b.daysSince - a.daysSince);
}

export function suggestMessage(c: RelanceCandidate): string {
  const amount = (c.document.amountTtcCents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
  const tone = c.suggestedTone;
  const opening = tone === "doux"
    ? `Bonjour ${c.client.name.split(" ")[0]},\n\nJ'espère que vous allez bien. Je reviens vers vous concernant`
    : tone === "neutre"
      ? `Bonjour ${c.client.name.split(" ")[0]},\n\nUn petit suivi rapide concernant`
      : `Bonjour ${c.client.name.split(" ")[0]},\n\nJe me permets de vous solliciter à propos`;
  const subject = c.document.type === "devis"
    ? `notre devis ${c.document.number} (${amount}) envoyé il y a ${c.daysSince} jours.`
    : `la facture ${c.document.number} (${amount}) envoyée il y a ${c.daysSince} jours.`;
  const close = c.document.type === "devis"
    ? `\n\nAvez-vous des questions auxquelles je peux répondre pour avancer ?\n\nÀ très vite,\nMaison Fwurtz`
    : `\n\nPourriez-vous m'indiquer où en est le règlement ? Je reste disponible si quoi que ce soit n'est pas clair.\n\nMerci,\nMaison Fwurtz`;
  return `${opening} ${subject}${close}`;
}
