-- Lets a client safely retry a write whose answer it never received: the same key
-- returns the stored answer instead of doing the work twice. A key is claimed in
-- the same database transaction as the write, so a failed write leaves no claim.
CREATE TABLE IF NOT EXISTS idempotency_keys (
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  scope VARCHAR(40) NOT NULL,
  key VARCHAR(128) NOT NULL,
  response_status INTEGER,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, scope, key)
);

ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS idempotency_keys_wallet_isolation ON idempotency_keys;
CREATE POLICY idempotency_keys_wallet_isolation ON idempotency_keys
  FOR ALL
  USING (user_id IN (SELECT user_id FROM wallet_identities))
  WITH CHECK (user_id IN (SELECT user_id FROM wallet_identities));

GRANT SELECT, INSERT, UPDATE ON idempotency_keys TO memeora_runtime;
