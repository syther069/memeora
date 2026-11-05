-- Least-privilege runtime role for request handling. It owns nothing, cannot
-- bypass RLS, and gets only the table privileges the application uses.
-- Login and password are set outside migrations (never commit a password).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'memeora_runtime') THEN
    -- These are PostgreSQL's defaults for a new role, stated explicitly. Some
    -- hosts (e.g. Neon) do not let the owner ALTER replication/RLS attributes.
    CREATE ROLE memeora_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO memeora_runtime;

-- Server-only authentication tables (no RLS; never exposed to clients).
-- SELECT ... FOR UPDATE requires UPDATE privilege.
GRANT SELECT, INSERT ON app_users TO memeora_runtime;
GRANT SELECT, INSERT, UPDATE ON wallet_identities TO memeora_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON wallet_challenges TO memeora_runtime;
GRANT SELECT, INSERT, UPDATE ON wallet_sessions TO memeora_runtime;

-- RLS-protected account data.
GRANT SELECT, INSERT, UPDATE ON profiles TO memeora_runtime;
GRANT INSERT ON profile_consent_events TO memeora_runtime;
GRANT SELECT, INSERT ON transactions TO memeora_runtime;
GRANT SELECT, INSERT, UPDATE ON budgets TO memeora_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON savings_goals TO memeora_runtime;
GRANT SELECT, INSERT, UPDATE ON financial_memories TO memeora_runtime;
