-- Each wallet uses its own Walrus Memory account. The row exists once the
-- account exists on Sui; `status` says whether Memeora's key for this wallet is
-- registered on it. Private keys are stored only as AES-256-GCM ciphertext.
CREATE TABLE IF NOT EXISTS wallet_memory_accounts (
  user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  account_id VARCHAR(66) NOT NULL,
  delegate_public_key TEXT NOT NULL,
  delegate_address VARCHAR(66) NOT NULL,
  encrypted_delegate_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'ready', 'revoked')),
  registered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A wallet-signed Security Delete in progress. Tracked so an uncertain outcome
-- (a timeout during submit) is reconciled and never reported as deleted.
CREATE TABLE IF NOT EXISTS memory_delete_batches (
  batch_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  blob_ids TEXT[] NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('awaiting_signature', 'executing', 'completed', 'failed', 'rolled_back')),
  digest TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS memory_delete_batches_user_state_idx
  ON memory_delete_batches(user_id, state);

-- Set only after Walrus reports the deletion complete.
ALTER TABLE financial_memories
  ADD COLUMN IF NOT EXISTS walrus_deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS walrus_delete_digest TEXT;

ALTER TABLE wallet_memory_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_memory_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE memory_delete_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_delete_batches FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wallet_memory_accounts_wallet_isolation ON wallet_memory_accounts;
CREATE POLICY wallet_memory_accounts_wallet_isolation ON wallet_memory_accounts
  FOR ALL
  USING (user_id IN (SELECT user_id FROM wallet_identities))
  WITH CHECK (user_id IN (SELECT user_id FROM wallet_identities));

DROP POLICY IF EXISTS memory_delete_batches_wallet_isolation ON memory_delete_batches;
CREATE POLICY memory_delete_batches_wallet_isolation ON memory_delete_batches
  FOR ALL
  USING (user_id IN (SELECT user_id FROM wallet_identities))
  WITH CHECK (user_id IN (SELECT user_id FROM wallet_identities));

GRANT SELECT, INSERT, UPDATE ON wallet_memory_accounts TO memeora_runtime;
GRANT SELECT, INSERT, UPDATE ON memory_delete_batches TO memeora_runtime;
