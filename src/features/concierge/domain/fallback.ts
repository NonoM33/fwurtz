/**
 * Keyword-based fallback used when the LLM provider is unreachable.
 * Pure function: no I/O. Keeps the conversation alive in degraded mode.
 */

const RULES: ReadonlyArray<{ test: RegExp; reply: string }> = [
  {
    test: /prix|tarif|combien|co[uû]te/i,
    reply:
      "Pour vous donner un prix juste, le plus simple est un échange de 30 minutes sans engagement. *Souhaitez-vous que je vous propose un créneau ?*",
  },
  {
    test: /rdv|rendez-?vous|appel|cr[eé]neau/i,
    reply:
      "Avec plaisir. Laissez-moi vos coordonnées juste en dessous, je vous propose des créneaux dès demain matin.",
  },
  {
    test: /site|web|internet/i,
    reply:
      "Nous concevons des sites élégants et performants, sur mesure. *Avez-vous déjà un site à faire évoluer, ou partons-nous de zéro ?*",
  },
  {
    test: /juridi|contrat|cgv|cgu/i,
    reply:
      "Je peux vous orienter — rédaction de contrats, mentions, conformité. Pour les actes complexes, je travaille avec des avocats de confiance. *Quelle est votre situation ?*",
  },
  {
    test: /mariage|[eé]v[eé]nement|r[eé]ception/i,
    reply:
      "Nous orchestrons l'ensemble — concept, prestataires, jour J. *De combien de personnes parlons-nous, et pour quand ?*",
  },
  {
    test: /admin|gestion|paperasse|facture/i,
    reply:
      "Tâches administratives, classement, suivi des échéances — nous nous en chargeons. *Quel est le volume mensuel approximatif ?*",
  },
];

const DEFAULT_REPLY =
  "Merci de votre message. *Pourriez-vous m'en dire un peu plus sur ce que vous recherchez ?* Je vous oriente avec plaisir.";

export function fallbackReply(userText: string): string {
  for (const { test, reply } of RULES) {
    if (test.test(userText)) return reply;
  }
  return DEFAULT_REPLY;
}
