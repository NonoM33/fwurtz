-- Initial schema for Maison Fwurtz back-office data.
-- All tables use TEXT primary keys (UUIDv4 generated in the app) for portability.
-- Timestamps are ISO-8601 strings stored as TEXT to keep them human-readable.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','manager','sales','editor','viewer')),
  avatar TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  org TEXT,
  email TEXT,
  phone TEXT,
  source TEXT NOT NULL DEFAULT 'autre' CHECK (source IN ('conciergerie','formulaire','telephone','recommandation','autre')),
  stage TEXT NOT NULL DEFAULT 'prospect' CHECK (stage IN ('prospect','qualified','meeting','proposal','client','lost')),
  score INTEGER NOT NULL DEFAULT 0,
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_clients_stage ON clients(stage);
CREATE INDEX IF NOT EXISTS idx_clients_owner ON clients(owner_id);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('devis','facture')),
  number TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon','envoye','accepte','paye','retard','perdu')),
  amount_ht_cents INTEGER NOT NULL DEFAULT 0,
  amount_ttc_cents INTEGER NOT NULL DEFAULT 0,
  vat_rate INTEGER NOT NULL DEFAULT 2000, -- bps (e.g. 2000 = 20%)
  lines_json TEXT NOT NULL DEFAULT '[]', -- JSON array of {label, qty, unit_price_cents}
  notes TEXT,
  emitted_at TEXT,
  due_at TEXT,
  sent_at TEXT,
  paid_at TEXT,
  pdf_path TEXT,
  stripe_payment_link TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'visio' CHECK (kind IN ('visio','telephone','presentiel')),
  scheduled_at TEXT NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'a_venir' CHECK (status IN ('a_venir','confirme','annule','realise')),
  location TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('concierge','formulaire','email','autre')),
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  visitor_name TEXT,
  visitor_email TEXT,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'ouvert' CHECK (status IN ('ouvert','en_cours','clos')),
  last_message_at TEXT NOT NULL DEFAULT (datetime('now')),
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last ON conversations(last_message_at);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  author TEXT NOT NULL, -- 'visitor' / 'marie' / user_id
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE, -- NULL = broadcast
  kind TEXT NOT NULL CHECK (kind IN ('message','rdv','devis','facture','temoignage','systeme')),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read_at);

-- ===== Editable site content =====

CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  blocks_json TEXT NOT NULL DEFAULT '[]',          -- published JSON
  draft_blocks_json TEXT,                           -- unpublished work
  meta_description TEXT,
  published_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pages_published ON pages(published_at);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  body_json TEXT NOT NULL DEFAULT '{}',
  icon TEXT,
  hero_image_slot TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_services_position ON services(position);

CREATE TABLE IF NOT EXISTS testimonials (
  id TEXT PRIMARY KEY,
  author_name TEXT NOT NULL,
  author_role TEXT,
  author_org TEXT,
  quote TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  position INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 0,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  source TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_testimonials_published ON testimonials(published, position);

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('ebook','article','outil','formation','autre')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  body_json TEXT,                  -- pour articles riches
  file_path TEXT,                  -- pour ebooks (PDF dans le storage)
  link_url TEXT,                   -- pour outils externes
  cover_image_slot TEXT,
  capture_email INTEGER NOT NULL DEFAULT 0, -- 1 = ask email avant download
  downloads_count INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_resources_published ON resources(published, position);

CREATE TABLE IF NOT EXISTS resource_leads (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  consented_at TEXT NOT NULL DEFAULT (datetime('now')),
  user_agent TEXT,
  ip_hash TEXT
);
CREATE INDEX IF NOT EXISTS idx_resource_leads_resource ON resource_leads(resource_id);
