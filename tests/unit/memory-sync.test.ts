import { describe, expect, it, vi } from 'vitest';
import { MemoryRecord, MemoryStatus } from '@/modules/financial-memory/domain/memory-record';
import { mergeRecall, settleWrites, unknownRecalled } from '@/modules/financial-memory/application/memory-sync';
import type { RecalledWalrusMemory, WalrusPort } from '@/modules/financial-memory/application/ports/walrus-port';

const WALLET = `0x${'d'.repeat(64)}`;

function record(id: string, status: MemoryStatus, extra: { blob?: string; job?: string; text?: string } = {}) {
  return MemoryRecord.create({
    id, userId: 'user-1', category: 'preference', text: extra.text ?? `Rule ${id} keep a buffer`,
    status, walrusBlobId: extra.blob ?? null, walrusJobId: extra.job ?? null,
  });
}

function hit(blobId: string, text: string, distance = 0.2): RecalledWalrusMemory {
  return { blobId, category: 'preference', text, distance, createdAt: null };
}

function fakeWalrus(overrides: Partial<WalrusPort> = {}): WalrusPort {
  return {
    writeMemory: vi.fn().mockResolvedValue({ status: 'pending', jobId: 'job-new', namespace: `memeora:${WALLET}` }),
    getWriteStatus: vi.fn().mockResolvedValue({ state: 'pending' }),
    recallMemories: vi.fn(),
    ...overrides,
  };
}

describe('settleWrites', () => {
  it('confirms finished jobs, fails dead ones, and leaves running ones alone', async () => {
    const getWriteStatus = vi.fn(async (jobId: string) => ({
      'job-a': { state: 'done' as const, blobId: 'blob-a' },
      'job-b': { state: 'failed' as const, error: 'quota' },
      'job-c': { state: 'pending' as const },
    })[jobId]!);
    const updates = await settleWrites(fakeWalrus({ getWriteStatus }), WALLET, [
      record('a', 'pending', { job: 'job-a' }),
      record('b', 'pending', { job: 'job-b' }),
      record('c', 'pending', { job: 'job-c' }),
    ]);
    expect(updates).toEqual([
      { id: 'a', status: 'confirmed', blobId: 'blob-a' },
      { id: 'b', status: 'failed' },
    ]);
  });

  it('resubmits unsent writes with the record id as idempotency key, so retries never pay twice', async () => {
    const walrus = fakeWalrus();
    const updates = await settleWrites(walrus, WALLET, [record('r', 'pending_retry', { text: 'Wait 48 hours before big buys' })]);
    expect(walrus.writeMemory).toHaveBeenCalledWith({
      namespaceOwner: WALLET, category: 'preference', text: 'Wait 48 hours before big buys', idempotencyKey: 'r',
    });
    expect(updates).toEqual([{ id: 'r', status: 'pending', jobId: 'job-new' }]);
  });

  it('keeps a write queued when Walrus still does not accept it', async () => {
    const walrus = fakeWalrus({ writeMemory: vi.fn().mockResolvedValue({ status: 'pending_retry', jobId: null, namespace: 'n' }) });
    expect(await settleWrites(walrus, WALLET, [record('r', 'pending_retry')])).toEqual([]);
  });
});

describe('mergeRecall', () => {
  it('uses Walrus relevance, honours removals, and adds writes not indexed yet', () => {
    const local = [
      record('kept', 'confirmed', { blob: 'blob-kept' }),
      record('removed', 'superseded', { blob: 'blob-removed' }),
      record('new', 'pending', { job: 'job-new', text: 'Brand new rule here' }),
    ];
    const selection = mergeRecall(local, {
      available: true,
      memories: [hit('blob-removed', 'Rule removed keep a buffer'), hit('blob-kept', 'Rule kept keep a buffer'), hit('blob-elsewhere', 'Written by another client')],
    });

    expect(selection.source).toBe('walrus');
    expect(selection.memories.map((m) => m.id)).toEqual(['kept', 'new']);
    expect(selection.unknown.map((m) => m.blobId)).toEqual(['blob-elsewhere']);
  });

  it('falls back to local active memories when Walrus does not answer', () => {
    const local = [record('kept', 'confirmed', { blob: 'b' }), record('removed', 'superseded', { blob: 'r' })];
    const selection = mergeRecall(local, { available: false, reason: 'relayer down' });
    expect(selection).toEqual({ memories: [local[0]], unknown: [], source: 'local_fallback' });
  });

  it('keeps the user\'s rules when recall returns nothing usable', () => {
    const local = [record('kept', 'confirmed', { blob: 'b' }), record('gone', 'superseded', { blob: 'deleted-blob' })];
    expect(mergeRecall(local, { available: true, memories: [] })).toEqual({ memories: [local[0]], unknown: [], source: 'local_fallback' });
    // The relayer can still return a blob deleted moments ago; it must not count as an answer.
    expect(mergeRecall(local, { available: true, memories: [hit('deleted-blob', 'Rule gone keep a buffer')] }))
      .toEqual({ memories: [local[0]], unknown: [], source: 'local_fallback' });
  });

  it('never counts a deleted memory among the hits next to a live one', () => {
    const local = [record('kept', 'confirmed', { blob: 'b' }), record('gone', 'superseded', { blob: 'deleted-blob' })];
    const selection = mergeRecall(local, { available: true, memories: [hit('deleted-blob', 'Rule gone keep a buffer'), hit('b', 'Rule kept keep a buffer')] });
    expect(selection.memories.map((m) => m.id)).toEqual(['kept']);
    expect(selection.source).toBe('walrus');
  });
});

describe('unknownRecalled', () => {
  it('does not treat a just-finished write of the user as a new memory', () => {
    const local = [record('w', 'pending', { job: 'job-w', text: 'Keep a $3,000 buffer' })];
    expect(unknownRecalled(local, [hit('blob-w', 'Keep a $3,000 buffer')])).toEqual([]);
    expect(unknownRecalled(local, [hit('blob-x', 'Another rule entirely')]).map((m) => m.blobId)).toEqual(['blob-x']);
  });

  it('does not bring back a memory the user removed while its write was pending', () => {
    const removed = [record('gone', 'superseded', { job: 'job-gone', text: 'Keep a $3,000 buffer' })];
    expect(unknownRecalled(removed, [hit('blob-gone', 'Keep a $3,000 buffer')])).toEqual([]);
    expect(mergeRecall(removed, { available: true, memories: [hit('blob-gone', 'Keep a $3,000 buffer')] }))
      .toMatchObject({ memories: [], unknown: [] });
  });
});
