# Database

Memeora uses PostgreSQL as the source of truth for all financial records. The schema lives in `migrations/` and is applied in filename order.

## Applying migrations

Use a direct owner connection, not a pooled one:

```bash
for f in db/migrations/*.sql; do psql "$DATABASE_MIGRATION_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```

Migration `0003` creates the `memeora_runtime` role without login, superuser or `BYPASSRLS` rights. Enable login with a password you generate, outside of any migration, and use that role's connection string as `DATABASE_URL`.

On Neon, create this role with SQL only. Roles created in the Console, CLI or API belong to `neon_superuser`, which has `BYPASSRLS` ([Neon docs](https://neon.com/docs/manage/roles)).

## Runtime requirements

- The application must never connect as the table owner or as a role with `BYPASSRLS`.
- Authenticated queries run through `withWalletTransaction()` in `src/lib/postgres/wallet-transaction.ts`, which sets the wallet context for that transaction only.
- The wallet passed to that helper must come from a verified session, never from request input.
- Session cookies hold an opaque token, and only its SHA-256 hash is stored.
- Sign in challenges are single use and expire after five minutes.

## Tests

`tests/integration/postgres-rls.test.ts` applies the schema to an in-process PGlite database and confirms that one wallet cannot read or change another wallet's data. It does not exercise a network connection or a hosted database.
