import type { MemoryRecord, MemoryStatus } from '../domain/memory-record';
import type { RecalledWalrusMemory, WalrusPort, WalrusRecallOutput } from './ports/walrus-port';

export interface WalrusStateUpdate {
  id: string;
  status: MemoryStatus;
  blobId?: string;
  jobId?: string;
}

/**
 * Moves unsettled writes forward: reads the status of accepted jobs, and
 * resubmits writes Walrus never accepted. Resubmission reuses the record id as
 * the idempotency key, so a write the relayer did receive is not paid twice.
 * Network only; the caller stores the returned updates.
 */
export async function settleWrites(
  walrus: WalrusPort,
  namespaceOwner: string,
  unsettled: MemoryRecord[],
): Promise<WalrusStateUpdate[]> {
  const updates: WalrusStateUpdate[] = [];
  for (const record of unsettled) {
    if (record.status === 'pending' && record.walrusJobId) {
      const job = await walrus.getWriteStatus(record.walrusJobId);
      if (job.state === 'done' && job.blobId) updates.push({ id: record.id, status: 'confirmed', blobId: job.blobId });
      else if (job.state === 'failed') updates.push({ id: record.id, status: 'failed' });
    } else if (record.status === 'pending_retry') {
      const write = await walrus.writeMemory({
        namespaceOwner,
        category: record.category,
        text: record.text,
        idempotencyKey: record.id,
      });
      if (write.status === 'pending' && write.jobId) updates.push({ id: record.id, status: 'pending', jobId: write.jobId });
    }
  }
  return updates;
}

/**
 * Recalled Walrus memories that have no local record. A recalled memory with
 * the same text as a local write that has no blob ID yet is that write, finished
 * on Walrus before its status was read, not a new memory. That includes a write
 * the user removed while it was pending: it must not come back.
 */
export function unknownRecalled(local: MemoryRecord[], recalled: RecalledWalrusMemory[]): RecalledWalrusMemory[] {
  const knownBlobs = new Set(local.map((r) => r.walrusBlobId).filter(Boolean));
  const withoutBlob = new Set(
    local
      .filter((r) => !r.walrusBlobId && (r.status === 'pending' || r.status === 'pending_retry' || r.status === 'superseded'))
      .map((r) => `${r.category}\n${r.text}`),
  );
  return recalled.filter((m) => !knownBlobs.has(m.blobId) && !withoutBlob.has(`${m.category}\n${m.text}`));
}

export interface AssistantMemorySelection {
  /** Memories the Assistant may use, most relevant first. */
  memories: MemoryRecord[];
  /** Walrus memories Memeora has no record of yet; import them so the user can see and remove them. */
  unknown: RecalledWalrusMemory[];
  /** walrus: relevance came from Walrus recall. local_fallback: Walrus did not answer. */
  source: 'walrus' | 'local_fallback';
}

/**
 * Chooses the Assistant's memory context. Walrus recall decides relevance;
 * the local index decides what the user removed (superseded) and adds the
 * user's own writes that are not on Walrus yet. If Walrus is unreachable, the
 * local active memories are used, so the Assistant still works.
 */
export function mergeRecall(local: MemoryRecord[], recall: WalrusRecallOutput): AssistantMemorySelection {
  const active = local.filter((record) => record.status !== 'superseded');
  if (!recall.available) return { memories: active, unknown: [], source: 'local_fallback' };

  const byBlob = new Map(local.filter((r) => r.walrusBlobId).map((r) => [r.walrusBlobId as string, r]));
  const memories: MemoryRecord[] = [];
  for (const hit of recall.memories) {
    const known = byBlob.get(hit.blobId);
    if (known && known.status !== 'superseded') memories.push(known);
  }
  const unknown = unknownRecalled(local, recall.memories);
  // Walrus search returns its nearest matches however weak, so with stored rules
  // and no usable hit the answer is incomplete, not "nothing relevant". The user's
  // rules still apply. (Hits may also be only memories deleted or hidden here.)
  if (memories.length === 0 && unknown.length === 0 && active.some((r) => r.status === 'confirmed')) {
    return { memories: active, unknown: [], source: 'local_fallback' };
  }
  // The user's newest rules count even before Walrus has indexed them.
  memories.push(...active.filter((r) => r.status === 'pending' || r.status === 'pending_retry'));
  return { memories, unknown, source: 'walrus' };
}
