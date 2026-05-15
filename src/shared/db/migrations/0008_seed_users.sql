-- Seed the founder so the team page isn't empty.
INSERT OR IGNORE INTO users (id, email, password_hash, name, role, avatar, created_at, updated_at) VALUES
  ('seed-user-1', 'sophie@maison-fwurtz.fr', 'placeholder-not-used-for-auth', 'Sophie Fwurtz', 'admin', NULL, datetime('now'), datetime('now'));
