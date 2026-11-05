-- Track Walrus Memory writes as background jobs, and the namespace each memory
-- was written to. Additive: existing rows keep NULLs and their current status.
ALTER TABLE financial_memories
  ADD COLUMN IF NOT EXISTS walrus_job_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS walrus_namespace VARCHAR(255);

-- A Walrus blob appears at most once per account, so memories recalled from
-- Walrus can be imported without duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS idx_memories_user_blob
  ON financial_memories(user_id, walrus_blob_id)
  WHERE walrus_blob_id IS NOT NULL;

-- Finds writes that still need a status check or a retry.
CREATE INDEX IF NOT EXISTS idx_memories_user_unsettled
  ON financial_memories(user_id, created_at)
  WHERE walrus_status IN ('pending', 'pending_retry');
