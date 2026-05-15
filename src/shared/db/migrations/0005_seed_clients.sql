-- Seed a handful of clients so the CRM kanban + clients list aren't empty.
INSERT OR IGNORE INTO clients (id, name, org, email, phone, source, stage, score, notes, created_at, updated_at) VALUES
  ('seed-cli-1', 'Camille Larue', 'Atelier Bardin', 'camille@atelier-bardin.fr', '+33 6 12 34 56 78', 'conciergerie', 'client', 85, 'Récurrent — refonte site en cours', datetime('now', '-30 days'), datetime('now', '-2 days')),
  ('seed-cli-2', 'Marc & Pauline V.', NULL, 'marc.v@example.com', '+33 6 22 33 44 55', 'recommandation', 'proposal', 72, 'Mariage Saint-Cloud · devis 11 200 €', datetime('now', '-12 days'), datetime('now', '-4 days')),
  ('seed-cli-3', 'Julien Hervé', 'Galerie Saint-Honoré', 'julien@galerie-sh.fr', NULL, 'formulaire', 'meeting', 68, 'RDV visio confirmé 17/05', datetime('now', '-8 days'), datetime('now', '-1 days')),
  ('seed-cli-4', 'Adèle Marchand', 'Atelier de mode', 'adele@example.com', NULL, 'conciergerie', 'qualified', 55, 'Atelier de mode — devis envoyé', datetime('now', '-14 days'), datetime('now', '-3 days')),
  ('seed-cli-5', 'Raphaël Boyer', 'Cabinet Boyer & Associés', 'rb@cabinet-boyer.fr', '+33 1 45 67 89 01', 'telephone', 'proposal', 78, 'Cabinet d''avocats — devis 9 600 €', datetime('now', '-20 days'), datetime('now', '-7 days')),
  ('seed-cli-6', 'Denis Rondeau', 'Domaine Saint-Loup', 'd.rondeau@domaine-st-loup.fr', NULL, 'recommandation', 'client', 90, 'Facture envoyée 14/05 · 8 400 €', datetime('now', '-45 days'), datetime('now')),
  ('seed-cli-7', 'Louis Vermeil', 'Antiquaire', 'louis@vermeil.fr', NULL, 'conciergerie', 'client', 60, 'Facture en retard J+12 · 3 200 €', datetime('now', '-60 days'), datetime('now', '-12 days')),
  ('seed-cli-8', 'Mathilde Doré', NULL, 'mathilde@example.com', NULL, 'formulaire', 'prospect', 25, 'A téléchargé l''e-book', datetime('now', '-3 days'), datetime('now', '-3 days'));
