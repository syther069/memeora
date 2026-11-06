# Provider-neutral PostgreSQL

Memeora's only database. `migrations/` holds the full schema, applied in order (0001 → 0010, listed below).

## Migrations

Apply in order with the owner connection in `DATABASE_MIGRATION_URL` (direct, not pooled):

1. `0001_provider_neutral_core.sql` — schema, RLS enabled and forced, wallet-isolation policies.
2. `0002_onboarding_consent_audit.sql` — onboarding fields and consent audit events.
3. `0003_runtime_role_grants.sql` — creates `memeora_runtime` (no login, no superuser, no `BYPASSRLS`) and grants only the table privileges the app uses. `SELECT … FOR UPDATE` needs `UPDATE`, which is why some read paths carry it.
4. `0004_walrus_jobs_and_namespace.sql` — Walrus job id and namespace per memory, a unique `(user_id, walrus_blob_id)` index (no duplicate imports; a removed memory is never re-imported), and an index for unsettled writes.
5. `0005_transaction_edit_delete.sql` — lets users correct and delete their own transactions (RLS still applies).

After 0003, enable login for `memeora_runtime` with a generated password outside of any migration, and put its **pooled** connection string in `DATABASE_URL`. Pooled (transaction-mode) connections are safe because every request sets its wallet context with `set_config(..., TRUE)` inside its own transaction.

**Neon:** roles created in the Neon Console, CLI or API are members of `neon_superuser`, which has `BYPASSRLS` ([Neon docs](https://neon.com/docs/manage/roles)). Create the runtime role with SQL (0003), never in the Console. Neon's owner role cannot `ALTER` replication/RLS attributes, so 0003 sets them at `CREATE ROLE`.

## Runtime connection requirements

- `DATABASE_URL` must point to a dedicated Memeora runtime role. Do not connect as the schema/table owner or a `BYPASSRLS` role.
- Apply migrations with a separate migration role. Never use migration credentials in request handling.
- The runtime role needs only the table privileges required by the application. It must not receive DDL, role-management, or `BYPASSRLS` privileges.
- Every authenticated repository operation must use `withWalletTransaction()` from `src/lib/postgres/wallet-transaction.ts`. The wallet address passed to it must come from a verified Memeora session, not request input. The helper binds the address with transaction-local `set_config(..., TRUE)`, commits/rolls back, and releases the connection.
- Wallet challenges and sessions are accessed only by server authentication code. The wallet session cookie contains an opaque random token; PostgreSQL stores only its SHA-256 hash. Challenge nonces are single-use and expire after five minutes. Set `MEMEORA_APP_ORIGIN` to the exact public application origin in production.
- The migration enables and forces RLS for wallet identity and all finance/memory tables. Policies resolve the current wallet through `wallet_identities`, whose own policy is scoped to the transaction-local wallet setting.
- New profiles default to memory consent off. `profile_consent_events` records explicit choices; onboarding writes the profile, audit event, optional budget, and optional savings goal atomically.

## Local verification

`tests/integration/postgres-rls.test.ts` applies both migrations to an ephemeral PGlite PostgreSQL engine, seeds two wallets, switches to a non-owner `NOBYPASSRLS` runtime role, and runs the transaction helper against PostgreSQL to verify cross-wallet reads and writes are blocked and consent audit rows remain private. `tests/unit/postgres-transaction.test.ts` separately verifies begin/context/commit and rollback behavior.

PGlite validates PostgreSQL schema/policy behavior without Docker. It does not validate a network connection string or production host configuration. Those require a separately provisioned local PostgreSQL server and valid least-privilege roles.
