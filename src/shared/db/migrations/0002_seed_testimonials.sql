-- Seed the three testimonials from the maquette so the home page keeps its
-- original copy until Sophie writes new ones from the back office.
INSERT OR IGNORE INTO testimonials (id, author_name, author_role, author_org, quote, rating, position, featured, published, source, created_at, updated_at) VALUES
  ('seed-tmn-1', 'Camille Larue', 'Fondatrice', 'Atelier Bardin',
   'Une rigueur rare et une intelligence des situations. Maison Fwurtz a structuré mon activité en quelques semaines — je dors mieux depuis.',
   5, 1, 1, 1, 'maquette', datetime('now'), datetime('now')),
  ('seed-tmn-2', 'Marc & Pauline V.', NULL, 'Mariage à Saint-Cloud',
   'Discrétion, élégance, efficacité. Un mariage organisé sans le moindre faux pas. On a juste eu à être heureux.',
   5, 2, 1, 1, 'maquette', datetime('now'), datetime('now')),
  ('seed-tmn-3', 'Julien Hervé', NULL, 'Galerie Saint-Honoré',
   'Le site qu''elle nous a livré nous ressemble enfin. Et les recommandations juridiques nous ont évité une mauvaise surprise.',
   5, 3, 1, 1, 'maquette', datetime('now'), datetime('now'));
