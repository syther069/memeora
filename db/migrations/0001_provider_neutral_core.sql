-- Target PostgreSQL schema for provider-neutral wallet-authenticated Memeora.

CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_identities (
  wallet_address VARCHAR(66) PRIMARY KEY
    CHECK (wallet_address ~ '^0x[0-9a-f]{64}$'),
  user_id UUID NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  preferred_currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  memory_consent_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  memory_consent_updated_at TIMESTAMPTZ,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transactions_user_occurred
  ON transactions(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category
  ON transactions(user_id, category);

CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL CHECK (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, period)
);

CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  target_amount_minor BIGINT NOT NULL CHECK (target_amount_minor > 0),
  current_amount_minor BIGINT NOT NULL DEFAULT 0 CHECK (current_amount_minor >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  target_date VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  category VARCHAR(20) NOT NULL CHECK (category IN ('goal', 'preference', 'budget')),
  memory_text TEXT NOT NULL CHECK (length(memory_text) BETWEEN 5 AND 500),
  walrus_blob_id VARCHAR(255),
  walrus_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (walrus_status IN ('pending', 'confirmed', 'pending_retry', 'failed', 'superseded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_memories_user_status
  ON financial_memories(user_id, walrus_status);

CREATE TABLE IF NOT EXISTS wallet_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(66) NOT NULL REFERENCES wallet_identities(wallet_address) ON DELETE CASCADE,
  token_hash BYTEA NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(66) NOT NULL CHECK (wallet_address ~ '^0x[0-9a-f]{64}$'),
  nonce_hash BYTEA NOT NULL UNIQUE,
  purpose VARCHAR(32) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep ownership as stable internal UUIDs; resolve the authenticated wallet to
-- an account through an RLS-protected identity table. Each request transaction
-- must set this local value from its verified Memeora session only.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'wallet_identities', 'profiles', 'transactions', 'budgets',
    'savings_goals', 'financial_memories'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
  END LOOP;
END
$$;

CREATE POLICY wallet_identity_self ON wallet_identities
  FOR ALL
  USING (wallet_address = current_setting('memeora.wallet_address', TRUE))
  WITH CHECK (wallet_address = current_setting('memeora.wallet_address', TRUE));

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'transactions', 'budgets', 'savings_goals', 'financial_memories'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (user_id IN (SELECT user_id FROM wallet_identities)) WITH CHECK (user_id IN (SELECT user_id FROM wallet_identities))',
      table_name || '_wallet_isolation',
      table_name
    );
  END LOOP;
END
$$;

CREATE POLICY profiles_wallet_isolation ON profiles
  FOR ALL
  USING (id IN (SELECT user_id FROM wallet_identities))
  WITH CHECK (id IN (SELECT user_id FROM wallet_identities));

-- wallet_sessions/challenges are accessed only by server auth code and require
-- explicit grants to the runtime role. They are deliberately not exposed to a
-- client-facing database role.
