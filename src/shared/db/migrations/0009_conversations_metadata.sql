-- RGPD-pseudonymous visitor tracking: keep enough to recognise a returning
-- visitor without storing their raw IP. Hash rotates daily so old data
-- de-identifies on its own.
ALTER TABLE conversations ADD COLUMN visitor_ip_hash TEXT;
ALTER TABLE conversations ADD COLUMN user_agent TEXT;
ALTER TABLE conversations ADD COLUMN started_page TEXT;

CREATE INDEX IF NOT EXISTS idx_conversations_ip_hash ON conversations(visitor_ip_hash);
