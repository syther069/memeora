import type { AppMode } from '@/lib/app-mode';
import type { PostgresClient } from '@/lib/postgres/wallet-transaction';
import { MemoryCategory, MemoryRecord, MemoryStatus } from '../domain/memory-record';
import type { RecalledWalrusMemory } from '../application/ports/walrus-port';

/** What is left of a memory's text in Memeora after its permanent deletion. */
const DELETED_MEMORY_TEXT = '[permanently deleted]';

export type WriteReservation =
  | { outcome: 'reserved' }
  | { outcome: 'duplicate'; existing: MemoryRecord }
  | { outcome: 'restored'; existing: MemoryRecord };

/** Consent policy recorded with each consent change made outside onboarding. */
export const MEMORY_CONSENT_POLICY_VERSION = '2026-11-04-v1';

interface DbMemory {
  id: string;
  user_id: string;
  category: MemoryCategory;
  memory_text: string;
  walrus_blob_id: string | null;
  walrus_job_id: string | null;
  walrus_status: MemoryStatus;
  created_at: Date | string;
  updated_at: Date | string;
}

function toMemoryRecord(row: DbMemory): MemoryRecord {
  return MemoryRecord.create({
    id: row.id,
    userId: row.user_id,
    category: row.category,
    text: row.memory_text,
    walrusBlobId: row.walrus_blob_id,
    walrusJobId: row.walrus_job_id,
    status: row.walrus_status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });
}

/**
 * Memory metadata of one workspace, and the account's consent, in PostgreSQL.
 * Every memory query is limited to the repository's mode. The client must come from
 * `withWalletTransaction`, so row-level security limits every query to the
 * verified wallet's account; the explicit user_id filters are a second guard.
 */
export class PostgresMemoryRepository {
  constructor(private readonly client: PostgresClient, private readonly mode: AppMode = 'personal') {}

  async findActiveByUserId(userId: string): Promise<MemoryRecord[]> {
    const result = await this.client.query(
      `SELECT * FROM financial_memories
       WHERE user_id = $1 AND mode = $2 AND walrus_status <> 'superseded'
       ORDER BY created_at DESC`,
      [userId, this.mode],
    ) as { rows: DbMemory[] };
    return result.rows.map(toMemoryRecord);
  }

  /** Every memory of the account, including removed ones (to honour removals in recall). */
  async findAllByUserId(userId: string): Promise<MemoryRecord[]> {
    const result = await this.client.query(
      'SELECT * FROM financial_memories WHERE user_id = $1 AND mode = $2 ORDER BY created_at DESC',
      [userId, this.mode],
    ) as { rows: DbMemory[] };
    return result.rows.map(toMemoryRecord);
  }

  /** Writes whose Walrus job still needs a status check or a retry, oldest first. */
  async findUnsettled(userId: string, limit: number): Promise<MemoryRecord[]> {
    const result = await this.client.query(
      `SELECT * FROM financial_memories
       WHERE user_id = $1 AND mode = $3 AND walrus_status IN ('pending', 'pending_retry')
       ORDER BY created_at ASC LIMIT $2`,
      [userId, limit, this.mode],
    ) as { rows: DbMemory[] };
    return result.rows.map(toMemoryRecord);
  }

  async save(record: MemoryRecord, namespace: string): Promise<void> {
    await this.client.query(
      `INSERT INTO financial_memories(id, user_id, category, memory_text, walrus_blob_id, walrus_job_id,
                                      walrus_namespace, walrus_status, created_at, updated_at, mode)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10)`,
      [record.id, record.userId, record.category, record.text, record.walrusBlobId, record.walrusJobId,
        namespace, record.status, record.createdAt.toISOString(), this.mode],
    );
  }

  /**
   * Records the memory before anything goes to Walrus, so a repeated request or
   * a crash cannot pay for the same memory twice. The lock makes the check and
   * the insert one step per account. Saving text the user had only hidden brings
   * that memory back, since it is still on Walrus.
   */
  async reserveWrite(record: MemoryRecord, namespace: string): Promise<WriteReservation> {
    await this.client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`memory-write:${record.userId}`]);
    const same = await this.client.query(
      `SELECT * FROM financial_memories
       WHERE user_id = $1 AND mode = $3 AND LOWER(memory_text) = LOWER($2) AND walrus_status <> 'failed' AND walrus_deleted_at IS NULL
       ORDER BY created_at ASC`,
      [record.userId, record.text, this.mode],
    ) as { rows: DbMemory[] };
    const live = same.rows.find((row) => row.walrus_status !== 'superseded');
    if (live) return { outcome: 'duplicate', existing: toMemoryRecord(live) };

    const hidden = same.rows.find((row) => row.walrus_blob_id);
    if (hidden) {
      const restored = await this.client.query(
        `UPDATE financial_memories SET walrus_status = 'confirmed', updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
        [hidden.id, record.userId],
      ) as { rows: DbMemory[] };
      return { outcome: 'restored', existing: toMemoryRecord(restored.rows[0]) };
    }

    await this.save(record, namespace);
    return { outcome: 'reserved' };
  }

  /**
   * Records a write's new Walrus state. Never touches a memory the user has
   * removed meanwhile, so a late confirmation cannot resurrect it.
   */
  async updateWalrusState(
    id: string,
    userId: string,
    state: { status: MemoryStatus; blobId?: string | null; jobId?: string | null },
  ): Promise<void> {
    await this.client.query(
      `UPDATE financial_memories
       SET walrus_status = $3,
           walrus_blob_id = COALESCE($4, walrus_blob_id),
           walrus_job_id = COALESCE($5, walrus_job_id),
           updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND walrus_status <> 'superseded'`,
      [id, userId, state.status, state.blobId ?? null, state.jobId ?? null],
    );
  }

  /**
   * Adds memories found on Walrus that this account has no record of yet (for
   * example written by another client of the same namespace), so they can be
   * inspected and removed in Memeora. Returns only the newly added records.
   */
  async importRecalled(userId: string, namespace: string, memories: RecalledWalrusMemory[]): Promise<MemoryRecord[]> {
    const imported: MemoryRecord[] = [];
    for (const memory of memories) {
      let record: MemoryRecord;
      try {
        record = MemoryRecord.create({
          id: globalThis.crypto.randomUUID(),
          userId,
          category: memory.category,
          text: memory.text,
          walrusBlobId: memory.blobId,
          status: 'confirmed',
          createdAt: memory.createdAt ?? new Date(),
        });
      } catch {
        continue; // Not representable as a Memeora memory (e.g. too long).
      }
      const result = await this.client.query(
        `INSERT INTO financial_memories(id, user_id, category, memory_text, walrus_blob_id, walrus_namespace,
                                        walrus_status, created_at, updated_at, mode)
         VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', $7, NOW(), $8)
         ON CONFLICT (user_id, walrus_blob_id) WHERE walrus_blob_id IS NOT NULL DO NOTHING
         RETURNING *`,
        [record.id, userId, record.category, record.text, record.walrusBlobId, namespace, record.createdAt.toISOString(), this.mode],
      ) as { rows: DbMemory[] };
      if (result.rows[0]) imported.push(toMemoryRecord(result.rows[0]));
    }
    return imported;
  }

  async markSuperseded(id: string, userId: string): Promise<boolean> {
    const result = await this.client.query(
      `UPDATE financial_memories SET walrus_status = 'superseded', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND walrus_status <> 'superseded'
       RETURNING id`,
      [id, userId],
    ) as { rows: Array<{ id: string }> };
    return result.rows.length > 0;
  }

  /** Memories hidden in Memeora whose encrypted copy is still on Walrus. */
  async findHiddenOnWalrus(userId: string): Promise<MemoryRecord[]> {
    const result = await this.client.query(
      `SELECT * FROM financial_memories
       WHERE user_id = $1 AND mode = $2 AND walrus_status = 'superseded' AND walrus_blob_id IS NOT NULL
         AND walrus_deleted_at IS NULL AND walrus_delete_digest IS NULL
       ORDER BY created_at DESC`,
      [userId, this.mode],
    ) as { rows: DbMemory[] };
    return result.rows.map(toMemoryRecord);
  }

  /** This memory's blob, if it has one that has not been deleted, and any deletion awaiting Sui. */
  async findDeletable(id: string, userId: string): Promise<{ blobId: string; digest: string | null } | null> {
    const result = await this.client.query(
      `SELECT walrus_blob_id, walrus_delete_digest FROM financial_memories
       WHERE id = $1 AND user_id = $2 AND walrus_blob_id IS NOT NULL AND walrus_deleted_at IS NULL`,
      [id, userId],
    ) as { rows: Array<{ walrus_blob_id: string; walrus_delete_digest: string | null }> };
    const row = result.rows[0];
    return row ? { blobId: row.walrus_blob_id, digest: row.walrus_delete_digest } : null;
  }

  /** Signed deletions Sui has not confirmed yet. */
  async findPendingDeletes(userId: string): Promise<Array<{ id: string; blobId: string; digest: string; updatedAt: Date }>> {
    const result = await this.client.query(
      `SELECT id, walrus_blob_id, walrus_delete_digest, updated_at FROM financial_memories
       WHERE user_id = $1 AND mode = $2 AND walrus_delete_digest IS NOT NULL AND walrus_deleted_at IS NULL
       ORDER BY updated_at ASC`,
      [userId, this.mode],
    ) as { rows: Array<{ id: string; walrus_blob_id: string; walrus_delete_digest: string; updated_at: Date | string }> };
    return result.rows.map((row) => ({ id: row.id, blobId: row.walrus_blob_id, digest: row.walrus_delete_digest, updatedAt: new Date(row.updated_at) }));
  }

  async setDeleteDigest(id: string, userId: string, digest: string | null): Promise<void> {
    await this.client.query(
      `UPDATE financial_memories SET walrus_delete_digest = $3, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND walrus_deleted_at IS NULL`,
      [id, userId, digest],
    );
  }

  /** Only after Sui shows the deletion. Removes the text from Memeora as well. */
  async markDeletedOnWalrus(id: string, userId: string, digest: string): Promise<void> {
    await this.client.query(
      `UPDATE financial_memories
       SET walrus_status = 'superseded', walrus_deleted_at = NOW(), walrus_delete_digest = $3,
           memory_text = $4, updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [id, userId, digest, DELETED_MEMORY_TEXT],
    );
  }

  async getConsent(userId: string): Promise<boolean> {
    const result = await this.client.query(
      'SELECT memory_consent_enabled FROM profiles WHERE id = $1',
      [userId],
    ) as { rows: Array<{ memory_consent_enabled: boolean }> };
    return result.rows[0]?.memory_consent_enabled === true;
  }

  /** Records a consent change made in settings, with an audit event. */
  async setConsent(userId: string, enabled: boolean): Promise<void> {
    await this.client.query(
      `INSERT INTO profiles(id, memory_consent_enabled, memory_consent_updated_at,
                            memory_consent_policy_version, memory_consent_source, updated_at)
       VALUES ($1, $2, NOW(), $3, 'settings', NOW())
       ON CONFLICT (id) DO UPDATE SET
         memory_consent_enabled = EXCLUDED.memory_consent_enabled,
         memory_consent_updated_at = NOW(),
         memory_consent_policy_version = EXCLUDED.memory_consent_policy_version,
         memory_consent_source = EXCLUDED.memory_consent_source,
         updated_at = NOW()`,
      [userId, enabled, MEMORY_CONSENT_POLICY_VERSION],
    );
    await this.client.query(
      `INSERT INTO profile_consent_events(user_id, consent_enabled, policy_version, source)
       VALUES ($1, $2, $3, 'settings')`,
      [userId, enabled, MEMORY_CONSENT_POLICY_VERSION],
    );
  }
}
