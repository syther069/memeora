import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Route code runs its real SQL against PGlite (PostgreSQL in-process) with the
// real migrations and RLS policies, under a non-owner runtime role.
const db = vi.hoisted(() => ({ instance: undefined as import('@electric-sql/pglite').PGlite | undefined }));
vi.mock('@/lib/postgres/pool', () => ({
  getPostgresPool: () => ({
    connect: async () => ({
      query: (sql: string, values?: readonly unknown[]) => db.instance!.query(sql, values ? [...values] : undefined),
      release: () => undefined,
    }),
  }),
}));

// Real signature verification, wrapped so a test can observe its options or
// simulate the verifier being unreachable.
vi.mock('@mysten/sui/verify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mysten/sui/verify')>();
  return { ...actual, isValidPersonalMessageSignature: vi.fn(actual.isValidPersonalMessageSignature) };
});

// Stand-in for the MemWal relayer (the network boundary), following the SDK
// contract: remember() accepts a background job keyed by idempotency key,
// getRememberStatus() reports it done with a blob ID, recall() searches one
// namespace. Everything above it (WalrusClient, sync, routes, SQL) is real.
const relayer = vi.hoisted(() => {
  const jobs = new Map<string, { namespace: string; text: string; blobId: string; checks: number }>();
  const state = {
    down: false,
    calls: [] as Array<{ method: string; namespace?: string; idempotencyKey?: string }>,
    jobs,
    seed(namespace: string, text: string, blobId: string) {
      jobs.set(`seed-${blobId}`, { namespace, text, blobId, checks: 1 });
    },
    reset() { jobs.clear(); state.calls.length = 0; state.down = false; },
  };
  return state;
});
vi.mock('@mysten-incubation/memwal', () => ({
  MemWal: {
    create: () => ({
      async remember(text: string, namespace: string, options: { idempotencyKey: string }) {
        if (relayer.down) throw new Error('relayer unreachable');
        relayer.calls.push({ method: 'remember', namespace, idempotencyKey: options.idempotencyKey });
        if (!relayer.jobs.has(options.idempotencyKey)) {
          relayer.jobs.set(options.idempotencyKey, { namespace, text, blobId: `blob-${options.idempotencyKey.slice(0, 8)}`, checks: 0 });
        }
        return { job_id: options.idempotencyKey, status: 'accepted' };
      },
      async getRememberStatus(jobId: string) {
        if (relayer.down) throw new Error('relayer unreachable');
        const job = relayer.jobs.get(jobId);
        if (!job) return { job_id: jobId, status: 'not_found' };
        job.checks += 1;
        return job.checks > 1 ? { job_id: jobId, status: 'done', blob_id: job.blobId } : { job_id: jobId, status: 'running' };
      },
      async recall({ namespace }: { namespace: string }) {
        if (relayer.down) throw new Error('relayer unreachable');
        relayer.calls.push({ method: 'recall', namespace });
        const results = [...relayer.jobs.values()]
          .filter((job) => job.namespace === namespace && job.checks > 1)
          .map((job, index) => ({ blob_id: job.blobId, text: job.text, distance: 0.1 + index / 10 }));
        return { results, total: results.length };
      },
      destroy() {},
    }),
  },
}));

import { NextRequest } from 'next/server';
import { isValidPersonalMessageSignature } from '@mysten/sui/verify';
import { POST as challengeRoute } from '@/app/api/auth/wallet/challenge/route';
import { POST as verifyRoute } from '@/app/api/auth/wallet/verify/route';
import { PUT as consentPut } from '@/app/api/memory/consent/route';
import { createMigratedDatabase, enableConsent, giveReadyMemoryAccount, jsonRequest, signIn, TEST_VAULT_SECRET } from '../helpers/wallet-harness';
import { POST as rememberRoute } from '@/app/api/memory/remember/route';
import { POST as recallRoute } from '@/app/api/memory/recall/route';
import { DELETE as deleteMemoryRoute } from '@/app/api/memory/[id]/route';
import { POST as assistantRoute } from '@/app/api/assistant/chat/route';
import { WALLET_SESSION_COOKIE } from '@/lib/auth/wallet-session';

const json = (url: string, body: unknown, cookie?: string) => jsonRequest('POST', url, body, cookie);

describe('wallet sign-in through Assistant and memory routes', () => {
  beforeAll(async () => {
    // Runs as the 0003 runtime role, so these tests also prove the
    // least-privilege grants cover every query the routes run.
    db.instance = await createMigratedDatabase();
  });

  afterAll(async () => {
    await db.instance?.close();
  });

  beforeEach(() => {
    vi.stubEnv('TATUM_API_KEY', '');
    vi.stubEnv('MEMEORA_DELEGATE_KEY_SECRET', TEST_VAULT_SECRET);
    vi.stubEnv('LLM_API_KEY', '');
    relayer.reset();
  });

  it('rejects replayed nonces, wrong signers, and mismatched addresses', async () => {
    const owner = new Ed25519Keypair();
    const attacker = new Ed25519Keypair();
    const address = owner.toSuiAddress();
    const challenge = await (await challengeRoute(json('/api/auth/wallet/challenge', { address }))).json();
    const message = new TextEncoder().encode(challenge.data.message);

    const forged = await attacker.signPersonalMessage(message);
    expect((await verifyRoute(json('/api/auth/wallet/verify', { address, nonce: challenge.data.nonce, signature: forged.signature }))).status).toBe(401);

    const { signature } = await owner.signPersonalMessage(message);
    const otherAddress = attacker.toSuiAddress();
    expect((await verifyRoute(json('/api/auth/wallet/verify', { address: otherAddress, nonce: challenge.data.nonce, signature }))).status).toBe(401);

    expect((await verifyRoute(json('/api/auth/wallet/verify', { address, nonce: challenge.data.nonce, signature }))).status).toBe(200);
    expect((await verifyRoute(json('/api/auth/wallet/verify', { address, nonce: challenge.data.nonce, signature }))).status).toBe(401);
  });

  it('lets a signed-in wallet use memory and the Assistant, isolated from other wallets', async () => {
    const keypair = new Ed25519Keypair();
    const cookie = await signIn(keypair);
    const otherCookie = await signIn(new Ed25519Keypair());

    // Without consent nothing is stored and the Assistant reports it.
    expect((await rememberRoute(json('/api/memory/remember', { category: 'preference', text: 'Keep a $3,000 buffer' }, cookie))).status).toBe(403);
    const before = await (await assistantRoute(json('/api/assistant/chat', { prompt: 'Can I afford $4,500?', cycleMonth: '2026-11' }, cookie))).json();
    expect(before.data.memoryStatus).toBe('not_consented');

    const consent = consentPut(new NextRequest('http://localhost:3000/api/memory/consent', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie: `${WALLET_SESSION_COOKIE}=${cookie}` },
      body: JSON.stringify({ enabled: true }),
    }));
    expect((await consent).status).toBe(200);

    // With consent but no Walrus account of its own, a wallet cannot save, and nothing is queued.
    const blocked = await rememberRoute(json('/api/memory/remember', { category: 'preference', text: 'Keep a $3,000 buffer' }, cookie));
    expect(blocked.status).toBe(409);
    expect((await blocked.json()).error.code).toBe('MEMORY_ACCOUNT_REQUIRED');
    const unset = await (await recallRoute(json('/api/memory/recall', {}, cookie))).json();
    expect(unset.data).toMatchObject({ count: 0, walrus: { available: false, setupRequired: true } });
    expect(relayer.calls).toEqual([]);

    // Walrus is down here, so the write is honestly queued, never faked as confirmed.
    await giveReadyMemoryAccount(db.instance!, keypair.toSuiAddress());
    relayer.down = true;
    const remembered = await rememberRoute(json('/api/memory/remember', { category: 'preference', text: 'Keep a $3,000 buffer' }, cookie));
    const memory = (await remembered.json()).data;
    expect(remembered.status).toBe(202);
    expect(memory).toMatchObject({ walrusStatus: 'pending_retry', walrusBlobId: null });

    const recalled = await (await recallRoute(json('/api/memory/recall', {}, cookie))).json();
    expect(recalled.data.memories.map((m: { id: string }) => m.id)).toEqual([memory.id]);
    expect((await (await recallRoute(json('/api/memory/recall', {}, otherCookie))).json()).data.count).toBe(0);

    const used = await (await assistantRoute(json('/api/assistant/chat', { prompt: 'Can I afford $4,500?', cycleMonth: '2026-11' }, cookie))).json();
    expect(used.data.memoryStatus).toBe('used');
    expect(used.data.recalledMemories.map((m: { id: string }) => m.id)).toEqual([memory.id]);

    const deleteRequest = (session: string) => deleteMemoryRoute(
      new NextRequest(`http://localhost:3000/api/memory/${memory.id}`, { method: 'DELETE', headers: { cookie: `${WALLET_SESSION_COOKIE}=${session}` } }),
      { params: Promise.resolve({ id: memory.id }) },
    );
    expect((await deleteRequest(otherCookie)).status).toBe(404);
    expect((await deleteRequest(cookie)).status).toBe(200);

    const after = await (await assistantRoute(json('/api/assistant/chat', { prompt: 'Can I afford $4,500?', cycleMonth: '2026-11' }, cookie))).json();
    expect(after.data.memoryStatus).toBe('none_found');
  });

  it('rejects an expired challenge even with a valid signature', async () => {
    const keypair = new Ed25519Keypair();
    const address = keypair.toSuiAddress();
    const challenge = await (await challengeRoute(json('/api/auth/wallet/challenge', { address }))).json();
    const { signature } = await keypair.signPersonalMessage(new TextEncoder().encode(challenge.data.message));
    await db.instance!.query("UPDATE wallet_challenges SET expires_at = NOW() - INTERVAL '1 second' WHERE id = $1", [challenge.data.challengeId]);

    const response = await verifyRoute(json('/api/auth/wallet/verify', { address, nonce: challenge.data.nonce, signature }));
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe('INVALID_CHALLENGE');
  });

  it('verifies through a Tatum Sui client and reports verifier outages as unavailable', async () => {
    vi.stubEnv('TATUM_API_KEY', 'tatum-test-key');
    const verifier = vi.mocked(isValidPersonalMessageSignature);
    const keypair = new Ed25519Keypair();
    const address = keypair.toSuiAddress();

    const first = await (await challengeRoute(json('/api/auth/wallet/challenge', { address }))).json();
    const firstSignature = (await keypair.signPersonalMessage(new TextEncoder().encode(first.data.message))).signature;
    // zkLogin checks need the network; an unreachable verifier is not an invalid signature.
    verifier.mockRejectedValueOnce(new Error('A Sui Client (GRPC, GraphQL, or JSON RPC) is required to verify zkLogin signatures'));
    const unavailable = await verifyRoute(json('/api/auth/wallet/verify', { address, nonce: first.data.nonce, signature: firstSignature }));
    expect(unavailable.status).toBe(503);
    expect(verifier.mock.lastCall?.[2]).toMatchObject({ address, client: expect.anything() });

    // The challenge was not consumed by the outage, so the user can retry it.
    expect((await verifyRoute(json('/api/auth/wallet/verify', { address, nonce: first.data.nonce, signature: firstSignature }))).status).toBe(200);
  });

  it('stores memories in the wallet namespace, confirms them, and answers from Walrus recall', async () => {
    const keypair = new Ed25519Keypair();
    const wallet = keypair.toSuiAddress();
    const namespace = `memeora:${wallet}`;
    const cookie = await signIn(keypair);
    await enableConsent(cookie);
    await giveReadyMemoryAccount(db.instance!, wallet);
    // A memory already in this wallet's namespace, written by another MemWal client.
    relayer.seed(namespace, 'Memeora category: budget. Cap cab rides at $1,500 per month', 'blob-seeded');
    relayer.jobs.get('seed-blob-seeded')!.checks = 2;

    // Fix 4: the write returns at once as a background job, in the wallet's namespace (fix 5).
    const remembered = await rememberRoute(json('/api/memory/remember', { category: 'preference', text: 'Keep a $3,000 buffer' }, cookie));
    const memory = (await remembered.json()).data;
    expect(remembered.status).toBe(202);
    expect(memory).toMatchObject({ walrusStatus: 'pending', walrusJobId: memory.id, walrusBlobId: null });
    expect(relayer.calls[0]).toEqual({ method: 'remember', namespace, idempotencyKey: memory.id });

    // First page load: job still running, and the seeded Walrus memory is imported.
    let page = (await (await recallRoute(json('/api/memory/recall', { limit: 50 }, cookie))).json()).data;
    expect(page.walrus).toEqual({ available: true, namespace });
    expect(page.memories.find((m: { id: string }) => m.id === memory.id).walrusStatus).toBe('pending');
    expect(page.memories.map((m: { walrusBlobId: string | null }) => m.walrusBlobId)).toContain('blob-seeded');

    // Next load: the job is done, so the write is confirmed with its real blob ID and not imported twice.
    page = (await (await recallRoute(json('/api/memory/recall', { limit: 50 }, cookie))).json()).data;
    const confirmed = page.memories.find((m: { id: string }) => m.id === memory.id);
    expect(confirmed).toMatchObject({ walrusStatus: 'confirmed', walrusBlobId: `blob-${memory.id.slice(0, 8)}` });
    expect(page.count).toBe(2);

    // Fix 3: the Assistant's memories come from Walrus recall in this namespace.
    const ask = async () => (await (await assistantRoute(json('/api/assistant/chat', { prompt: 'Can I afford $4,500?', cycleMonth: '2026-11' }, cookie))).json()).data;
    let answer = await ask();
    expect(answer.memorySource).toBe('walrus');
    expect(answer.recalledMemories.map((m: { id: string }) => m.id)).toContain(memory.id);
    expect(relayer.calls.at(-1)).toEqual({ method: 'recall', namespace });

    // A memory the user removed stays out, even though Walrus still returns it.
    const seeded = page.memories.find((m: { walrusBlobId: string }) => m.walrusBlobId === 'blob-seeded');
    await deleteMemoryRoute(
      new NextRequest(`http://localhost:3000/api/memory/${seeded.id}`, { method: 'DELETE', headers: { cookie: `${WALLET_SESSION_COOKIE}=${cookie}` } }),
      { params: Promise.resolve({ id: seeded.id }) },
    );
    answer = await ask();
    expect(answer.recalledMemories.map((m: { id: string }) => m.id)).toEqual([memory.id]);
    page = (await (await recallRoute(json('/api/memory/recall', { limit: 50 }, cookie))).json()).data;
    expect(page.memories.map((m: { id: string }) => m.id)).toEqual([memory.id]);

    // Walrus outage: the Assistant still answers from Memeora's index and says so.
    relayer.down = true;
    answer = await ask();
    expect(answer.memorySource).toBe('local_fallback');
    expect(answer.recalledMemories.map((m: { id: string }) => m.id)).toEqual([memory.id]);
  });

  it('queues a write the relayer did not accept and resubmits it once, under the same key', async () => {
    const keypair = new Ed25519Keypair();
    const cookie = await signIn(keypair);
    await enableConsent(cookie);
    await giveReadyMemoryAccount(db.instance!, keypair.toSuiAddress());

    relayer.down = true;
    const memory = (await (await rememberRoute(json('/api/memory/remember', { category: 'goal', text: 'Save $15,000 for Goa' }, cookie))).json()).data;
    expect(memory).toMatchObject({ walrusStatus: 'pending_retry', walrusJobId: null });

    relayer.down = false;
    const page = (await (await recallRoute(json('/api/memory/recall', { limit: 50 }, cookie))).json()).data;
    expect(page.memories[0]).toMatchObject({ id: memory.id, walrusStatus: 'pending' });
    expect(relayer.calls.filter((c) => c.method === 'remember')).toEqual([expect.objectContaining({ idempotencyKey: memory.id })]);
  });

  it('rejects requests whose session cookie is not a live session', async () => {
    expect((await assistantRoute(json('/api/assistant/chat', { prompt: 'Hi' }, 'x'.repeat(43)))).status).toBe(401);
  });
});
