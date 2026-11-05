-- Add auditable onboarding consent without changing or enabling any existing
-- user's consent. Existing consent values remain exactly as recorded.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS memory_consent_policy_version VARCHAR(32),
  ADD COLUMN IF NOT EXISTS memory_consent_source VARCHAR(32),
  ADD COLUMN IF NOT EXISTS onboarding_skipped_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS profile_consent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  consent_enabled BOOLEAN NOT NULL,
  policy_version VARCHAR(32) NOT NULL,
  source VARCHAR(32) NOT NULL CHECK (source IN ('onboarding', 'settings')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profile_consent_events_user_recorded
  ON profile_consent_events(user_id, recorded_at DESC);

ALTER TABLE profile_consent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_consent_events FORCE ROW LEVEL SECURITY;
CREATE POLICY profile_consent_events_wallet_isolation ON profile_consent_events
  FOR ALL
  USING (user_id IN (SELECT user_id FROM wallet_identities))
  WITH CHECK (user_id IN (SELECT user_id FROM wallet_identities));
