import { describe, it, expect, vi } from 'vitest';
import { MemoryRecord, MemoryValidationError } from '../../src/modules/financial-memory/domain/memory-record';
import { WalrusClient } from '../../src/modules/financial-memory/infrastructure/walrus-client';

describe('MemoryRecord Domain Entity', () => {
  it('creates a valid memory record with default pending status', () => {
    const record = MemoryRecord.create({
      id: 'mem_1',
      userId: 'user_123',
      category: 'goal',
      text: 'Prioritize saving ₹3,000 each month for liquid emergency reserves',
    });

    expect(record.id).toBe('mem_1');
    expect(record.userId).toBe('user_123');
    expect(record.category).toBe('goal');
    expect(record.text).toBe('Prioritize saving ₹3,000 each month for liquid emergency reserves');
    expect(record.status).toBe('pending');
    expect(record.walrusBlobId).toBeNull();
    expect(record.isConfirmed()).toBe(false);
  });

  it('rejects text under 5 characters', () => {
    expect(() =>
      MemoryRecord.create({
        id: 'mem_2',
        userId: 'user_123',
        category: 'preference',
        text: 'Save',
      })
    ).toThrow(MemoryValidationError);
  });

  it('rejects text exceeding 500 characters', () => {
    const longText = 'A'.repeat(501);
    expect(() =>
      MemoryRecord.create({
        id: 'mem_3',
        userId: 'user_123',
        category: 'budget',
        text: longText,
      })
    ).toThrow(MemoryValidationError);
  });

  it('rejects invalid category', () => {
    expect(() =>
      MemoryRecord.create({
        id: 'mem_4',
        userId: 'user_123',
        // @ts-expect-error Testing invalid runtime value
        category: 'random_category',
        text: 'Valid text length here',
      })
    ).toThrow(MemoryValidationError);
  });

  it('transitions status and updates walrusBlobId', () => {
    const record = MemoryRecord.create({
      id: 'mem_5',
      userId: 'user_123',
      category: 'goal',
      text: 'Save for laptop upgrade',
    });

    const confirmed = record.withStatus('confirmed', 'wal_blob_abc123');
    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.walrusBlobId).toBe('wal_blob_abc123');
    expect(confirmed.isConfirmed()).toBe(true);

    const superseded = confirmed.withStatus('superseded');
    expect(superseded.status).toBe('superseded');
    expect(superseded.isSuperseded()).toBe(true);
  });
});

const WALLET = `0x${'c'.repeat(64)}`;

function fakeSdk(overrides: Record<string, unknown> = {}) {
  const sdk = {
    remember: vi.fn().mockResolvedValue({ job_id: 'job_1', status: 'accepted' }),
    getRememberStatus: vi.fn(),
    recall: vi.fn(),
    destroy: vi.fn(),
    ...overrides,
  };
  const createClient = vi.fn(() => sdk as never);
  return { sdk, client: new WalrusClient({ key: 'test_delegate_key', accountId: '0xaccount', createClient, recallRetryDelaysMs: [] }), createClient };
}

describe('WalrusClient (MemWal SDK adapter)', () => {
  it('queues the write without calling Walrus when credentials are not configured', async () => {
    const client = new WalrusClient({ key: '', accountId: '' });
    const result = await client.writeMemory({ namespaceOwner: WALLET, category: 'goal', text: 'Emergency fund of ₹25,000', idempotencyKey: 'mem-1' });

    expect(result).toMatchObject({ status: 'pending_retry', jobId: null, namespace: `memeora:${WALLET}` });
    expect(result.warning).toContain('queued locally');
  });

  it('submits a background remember job in the wallet namespace with an idempotency key', async () => {
    const { sdk, client, createClient } = fakeSdk();
    const result = await client.writeMemory({ namespaceOwner: WALLET, category: 'goal', text: 'Emergency fund of ₹25,000', idempotencyKey: 'mem-1' });

    expect(result).toEqual({ status: 'pending', jobId: 'job_1', namespace: `memeora:${WALLET}` });
    expect(sdk.remember).toHaveBeenCalledWith('Memeora category: goal. Emergency fund of ₹25,000', `memeora:${WALLET}`, { idempotencyKey: 'mem-1', dedupe: true });
    expect(createClient).toHaveBeenCalledWith(expect.objectContaining({ serverUrl: 'https://relayer.memory.walrus.xyz', namespace: 'memeora' }));
    expect(sdk.destroy).toHaveBeenCalled();
  });

  it('retries while a new client warms up, then answers', async () => {
    const recall = vi.fn()
      .mockResolvedValueOnce({ results: [], total: 0, dropped_count: 1 })
      .mockResolvedValueOnce({ results: [{ blob_id: 'b', text: 'Memeora category: goal. Keep a buffer', distance: 0.2 }], total: 1 });
    const client = new WalrusClient({ key: 'k', accountId: '0xa', recallRetryDelaysMs: [0, 0], createClient: () => ({ recall, destroy: vi.fn() }) as never });
    expect(await client.recallMemories({ namespaceOwner: WALLET, query: 'x' })).toMatchObject({ available: true, memories: [{ blobId: 'b', category: 'goal', text: 'Keep a buffer' }] });
    expect(recall).toHaveBeenCalledTimes(2);
  });

  it('gives each workspace its own namespace, with Personal unchanged', () => {
    expect(new WalrusClient({ key: 'k', accountId: '0xa' }).namespaceFor(WALLET)).toBe(`memeora:${WALLET}`);
    expect(new WalrusClient({ key: 'k', accountId: '0xa', mode: 'personal' }).namespaceFor(WALLET)).toBe(`memeora:${WALLET}`);
    expect(new WalrusClient({ key: 'k', accountId: '0xa', mode: 'business' }).namespaceFor(WALLET)).toBe(`memeora:${WALLET}:business`);
  });

  it('treats a recall with unreadable matches as incomplete, not as an answer', async () => {
    const { client } = fakeSdk({ recall: vi.fn().mockResolvedValue({ results: [], total: 0, dropped_count: 2 }) });
    expect(await client.recallMemories({ namespaceOwner: WALLET, query: 'x' })).toMatchObject({ available: false });
  });

  it('queues a write the relayer did not accept, so it can be retried', async () => {
    const { client } = fakeSdk({ remember: vi.fn().mockRejectedValue(new Error('request timeout')) });
    const result = await client.writeMemory({ namespaceOwner: WALLET, category: 'goal', text: 'Emergency fund of ₹25,000', idempotencyKey: 'mem-1' });

    expect(result.status).toBe('pending_retry');
    expect(result.jobId).toBeNull();
    expect(result.warning).toContain('did not accept');
  });

  it('maps job states to done, failed, or still pending', async () => {
    const getRememberStatus = vi.fn()
      .mockResolvedValueOnce({ job_id: 'j', status: 'done', blob_id: 'blob_1' })
      .mockResolvedValueOnce({ job_id: 'j', status: 'uploaded' })
      .mockResolvedValueOnce({ job_id: 'j', status: 'failed', error: 'quota' })
      .mockResolvedValueOnce({ job_id: 'j', status: 'not_found' })
      .mockRejectedValueOnce(new Error('network down'));
    const { client } = fakeSdk({ getRememberStatus });

    expect(await client.getWriteStatus('j')).toEqual({ state: 'done', blobId: 'blob_1' });
    expect(await client.getWriteStatus('j')).toEqual({ state: 'pending' });
    expect(await client.getWriteStatus('j')).toEqual({ state: 'failed', error: 'quota' });
    expect(await client.getWriteStatus('j')).toEqual({ state: 'failed', error: 'not_found' });
    // An unreachable relayer says nothing about the job, so it is not marked failed.
    expect(await client.getWriteStatus('j')).toEqual({ state: 'pending' });
  });

  it('recalls semantically from the wallet namespace and parses categories', async () => {
    const recall = vi.fn().mockResolvedValue({
      results: [
        { blob_id: 'blob_pref', text: 'Memeora category: preference. Keep dining out under ₹3,500 per month', distance: 0.12, created_at: '2026-11-01T00:00:00.000Z' },
        { blob_id: 'blob_other', text: 'Written by another client', distance: 0.4 },
      ],
      total: 2,
    });
    const { client } = fakeSdk({ recall });
    const result = await client.recallMemories({ namespaceOwner: WALLET, query: 'monthly food spending', limit: 3 });

    expect(recall).toHaveBeenCalledWith({ query: 'monthly food spending', limit: 3, namespace: `memeora:${WALLET}`, timeoutMs: 10_000 });
    expect(result).toEqual({
      available: true,
      memories: [
        { blobId: 'blob_pref', category: 'preference', text: 'Keep dining out under ₹3,500 per month', distance: 0.12, createdAt: new Date('2026-11-01T00:00:00.000Z') },
        { blobId: 'blob_other', category: 'preference', text: 'Written by another client', distance: 0.4, createdAt: null },
      ],
    });
  });

  it('reports recall as unavailable instead of empty when Walrus does not answer', async () => {
    const { client } = fakeSdk({ recall: vi.fn().mockRejectedValue(new Error('relayer 503')) });
    expect(await client.recallMemories({ namespaceOwner: WALLET, query: 'x' })).toEqual({ available: false, reason: 'relayer 503' });
    expect(await new WalrusClient({ key: '', accountId: '' }).recallMemories({ namespaceOwner: WALLET, query: 'x' }))
      .toMatchObject({ available: false });
  });
});
