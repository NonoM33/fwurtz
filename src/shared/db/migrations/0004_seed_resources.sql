-- Seed the 4 ebooks from the /ressources page so it keeps its content.
INSERT OR IGNORE INTO resources
  (id, slug, type, title, summary, body_json, file_path, link_url, cover_image_slot, capture_email, downloads_count, position, published, created_at, updated_at) VALUES
  ('seed-res-1', 'organisation-productivite', 'ebook',
   'Organisation & Productivité',
   'Structurez vos journées, optimisez votre temps et boostez votre efficacité avec des méthodes simples.',
   '{"priceCents":2900,"badgeLabel":"GUIDE","ctaLabel":"Découvrir"}',
   NULL, NULL, NULL, 0, 0, 1, 1, datetime('now'), datetime('now')),
  ('seed-res-2', 'revenus-complementaires', 'ebook',
   'Revenus Complémentaires',
   'Découvrez des stratégies concrètes pour créer et développer des sources de revenus complémentaires.',
   '{"priceCents":3900,"badgeLabel":"GUIDE","ctaLabel":"Découvrir"}',
   NULL, NULL, NULL, 0, 0, 2, 1, datetime('now'), datetime('now')),
  ('seed-res-3', 'lancer-son-activite', 'ebook',
   'Lancer son activité',
   'Le guide étape par étape pour poser les bases solides de votre activité et attirer vos premiers clients.',
   '{"priceCents":4900,"badgeLabel":"GUIDE","ctaLabel":"Découvrir"}',
   NULL, NULL, NULL, 0, 0, 3, 1, datetime('now'), datetime('now')),
  ('seed-res-4', 'presence-en-ligne', 'ebook',
   'Présence en ligne',
   'Créez une présence en ligne alignée avec votre image et attirez les bonnes opportunités.',
   '{"priceCents":2900,"badgeLabel":"GUIDE","ctaLabel":"Découvrir"}',
   NULL, NULL, NULL, 0, 0, 4, 1, datetime('now'), datetime('now'));
