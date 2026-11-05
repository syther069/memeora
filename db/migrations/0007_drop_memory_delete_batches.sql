-- Relayer Security Delete only covers legacy blobs, so its batch tracking is
-- unused and never held a row. A deletion is now one wallet-signed Sui
-- transaction, tracked by financial_memories.walrus_delete_digest: set with
-- walrus_deleted_at empty means Sui has not confirmed it yet.
DROP TABLE IF EXISTS memory_delete_batches;
