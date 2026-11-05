import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterEach, describe, expect, it } from 'vitest';
import { PostgresPool, withWalletTransaction } from '../../src/lib/postgres/wallet-transaction';

const MIGRATION_PATH = path.join(process.cwd(), 'db', 'migrations', '0001_provider_neutral_core.sql');
const ONBOARDING_MIGRATION_PATH = path.join(process.cwd(), 'db', 'migrations', '0002_onboarding_consent_audit.sql');
const WALLET_A = `0x${'a'.repeat(64)}`;
const WALLET_B = `0x${'b'.repeat(64)}`;
const USER_A = '10000000-0000-4000-8000-000000000001';
const USER_B = '20000000-0000-4000-8000-000000000002';

describe('provider-neutral PostgreSQL RLS policies', () => {
  let database: PGlite | undefined;

  afterEach(async () => {
    await database?.close();
    database = undefined;
  });

  it('isolates reads and rejects cross-wallet inserts under a non-owner runtime role', async () => {
    database = new PGlite();
    const migration = await readFile(MIGRATION_PATH, 'utf8');
    await database.exec(migration);
    await database.exec(await readFile(ONBOARDING_MIGRATION_PATH, 'utf8'));
    await database.exec(`
      CREATE ROLE memeora_runtime NOLOGIN NOBYPASSRLS;
      GRANT USAGE ON SCHEMA public TO memeora_runtime;
      GRANT SELECT, INSERT, UPDATE, DELETE ON wallet_identities, profiles,
        transactions, budgets, savings_goals, financial_memories,
        profile_consent_events TO memeora_runtime;
      INSERT INTO app_users(id) VALUES ('${USER_A}'), ('${USER_B}');
      INSERT INTO wallet_identities(wallet_address, user_id)
        VALUES ('${WALLET_A}', '${USER_A}'), ('${WALLET_B}', '${USER_B}');
      INSERT INTO transactions(user_id, type, amount_minor, category)
        VALUES ('${USER_A}', 'expense', 100, 'dining'), ('${USER_B}', 'expense', 200, 'travel');
    `);

    await database.exec('SET ROLE memeora_runtime');
    const pool = {
      connect: async () => ({
        query: async (sql: string, values?: readonly unknown[]) =>
          database!.query(sql, values ? [...values] : undefined),
        release: () => undefined,
      }),
    } as unknown as PostgresPool;

    const rowsForA = await withWalletTransaction(WALLET_A, async (client) => {
      const result = await client.query('SELECT user_id, amount_minor FROM transactions ORDER BY amount_minor');
      return (result as { rows: Array<{ user_id: string; amount_minor: number }> }).rows;
    }, pool);
    const rowsForB = await withWalletTransaction(WALLET_B, async (client) => {
      const result = await client.query('SELECT user_id, amount_minor FROM transactions ORDER BY amount_minor');
      return (result as { rows: Array<{ user_id: string; amount_minor: number }> }).rows;
    }, pool);

    expect(rowsForA).toEqual([{ user_id: USER_A, amount_minor: 100 }]);
    expect(rowsForB).toEqual([{ user_id: USER_B, amount_minor: 200 }]);
    await expect(withWalletTransaction(WALLET_A, (client) => client.query(
      'INSERT INTO transactions(user_id, type, amount_minor, category) VALUES ($1, $2, $3, $4)',
      [USER_B, 'expense', 999, 'spoofed'],
    ), pool)).rejects.toThrow();
  }, 20_000);

  it('clears wallet context after transaction commit', async () => {
    database = new PGlite();
    await database.exec('BEGIN');
    await database.query("SELECT set_config('memeora.wallet_address', $1, TRUE)", [WALLET_A]);
    await database.exec('COMMIT');

    const context = await database.query<{ wallet_address: string }>(
      "SELECT current_setting('memeora.wallet_address', TRUE) AS wallet_address",
    );
    expect(context.rows[0]?.wallet_address).not.toBe(WALLET_A);
  }, 20_000);

  it('defaults memory consent off and scopes consent audit rows to the owning wallet', async () => {
    database = new PGlite();
    await database.exec(await readFile(MIGRATION_PATH, 'utf8'));
    await database.exec(await readFile(ONBOARDING_MIGRATION_PATH, 'utf8'));
    await database.exec(`
      CREATE ROLE memeora_runtime NOLOGIN NOBYPASSRLS;
      GRANT USAGE ON SCHEMA public TO memeora_runtime;
      GRANT SELECT, INSERT, UPDATE, DELETE ON wallet_identities, profiles,
        profile_consent_events TO memeora_runtime;
      INSERT INTO app_users(id) VALUES ('${USER_A}'), ('${USER_B}');
      INSERT INTO wallet_identities(wallet_address, user_id)
        VALUES ('${WALLET_A}', '${USER_A}'), ('${WALLET_B}', '${USER_B}');
      INSERT INTO profiles(id) VALUES ('${USER_A}'), ('${USER_B}');
      INSERT INTO profile_consent_events(user_id, consent_enabled, policy_version, source)
        VALUES ('${USER_A}', FALSE, 'test-v1', 'onboarding'),
               ('${USER_B}', TRUE, 'test-v1', 'settings');
      SET ROLE memeora_runtime;
    `);

    const pool = {
      connect: async () => ({
        query: async (sql: string, values?: readonly unknown[]) => database!.query(sql, values ? [...values] : undefined),
        release: () => undefined,
      }),
    } as unknown as PostgresPool;
    const result = await withWalletTransaction(WALLET_A, async (client) => {
      const profile = await client.query('SELECT memory_consent_enabled FROM profiles WHERE id = $1', [USER_A]);
      const events = await client.query('SELECT user_id FROM profile_consent_events');
      return {
        consent: (profile as { rows: Array<{ memory_consent_enabled: boolean }> }).rows[0]?.memory_consent_enabled,
        userIds: (events as { rows: Array<{ user_id: string }> }).rows.map((row) => row.user_id),
      };
    }, pool);

    expect(result.consent).toBe(false);
    expect(result.userIds).toEqual([USER_A]);
  }, 20_000);
});
