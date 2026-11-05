-- Personal and Business are separate workspaces of one account. Everything that
-- exists today belongs to Personal.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS active_mode VARCHAR(10) NOT NULL DEFAULT 'personal'
    CHECK (active_mode IN ('personal', 'business')),
  -- Cash the owner says the business holds. Only used to work out runway.
  ADD COLUMN IF NOT EXISTS business_cash_minor BIGINT CHECK (business_cash_minor >= 0),
  ADD COLUMN IF NOT EXISTS business_cash_currency VARCHAR(3);

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS mode VARCHAR(10) NOT NULL DEFAULT 'personal' CHECK (mode IN ('personal', 'business')),
  -- Business details: who was paid or paid us, and an invoice or reference.
  ADD COLUMN IF NOT EXISTS counterparty VARCHAR(100),
  ADD COLUMN IF NOT EXISTS reference VARCHAR(100),
  -- On-chain origin. amount_minor stays the ledger value in INR or USD.
  ADD COLUMN IF NOT EXISTS chain VARCHAR(20),
  ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(128),
  ADD COLUMN IF NOT EXISTS coin_type VARCHAR(255),
  ADD COLUMN IF NOT EXISTS asset_symbol VARCHAR(32),
  -- The exact token amount as a decimal string, never a float.
  ADD COLUMN IF NOT EXISTS asset_amount VARCHAR(80),
  ADD COLUMN IF NOT EXISTS verification VARCHAR(20) CHECK (verification IN ('sui_verified', 'unverified')),
  -- The ledger value came from today's rate for a transaction from another day.
  ADD COLUMN IF NOT EXISTS fiat_estimated BOOLEAN NOT NULL DEFAULT FALSE;

-- One ledger entry per token per transaction, across both modes.
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_onchain_unique
  ON transactions(user_id, chain, tx_hash, coin_type)
  WHERE tx_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_user_mode_occurred
  ON transactions(user_id, mode, occurred_at DESC);

ALTER TABLE budgets
  ADD COLUMN IF NOT EXISTS mode VARCHAR(10) NOT NULL DEFAULT 'personal' CHECK (mode IN ('personal', 'business'));
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_user_id_period_key;
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_user_mode_period_key;
ALTER TABLE budgets ADD CONSTRAINT budgets_user_mode_period_key UNIQUE (user_id, mode, period);

ALTER TABLE savings_goals
  ADD COLUMN IF NOT EXISTS mode VARCHAR(10) NOT NULL DEFAULT 'personal' CHECK (mode IN ('personal', 'business'));

ALTER TABLE financial_memories
  ADD COLUMN IF NOT EXISTS mode VARCHAR(10) NOT NULL DEFAULT 'personal' CHECK (mode IN ('personal', 'business'));
CREATE INDEX IF NOT EXISTS idx_memories_user_mode_status
  ON financial_memories(user_id, mode, walrus_status);
