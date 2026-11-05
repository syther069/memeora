import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Real routes, repositories, vault, SQL and RLS on PGlite under the runtime role.
// Only the network edges are stand-ins: Sui (via the chain reader and blob deletion),
// the relayer's HTTP API (via fetch), and MemWal's remember. The Sui-reading code
// itself is covered in tests/unit/walrus-blob-deletion.test.ts.
const db = vi.hoisted(() => ({ instance: undefined as import('@electric-sql/pglite').PGlite | undefined }));
vi.mock('@/lib/postgres/pool', () => ({
  getPostgresPool: () => ({
    connect: async () => ({
      query: (sql: string, values?: readonly unknown[]) => db.instance!.query(sql, values ? [...values] : undefined),
      release: () => undefined,
    }),
  }),
}));

const chain = vi.hoisted(() => ({
  account: null as null | { accountId: string; owner: string; active: boolean; delegateAddresses: string[] },
  addDelegateKeys: [] as string[],
  failing: false,
}));
vi.mock('@/modules/on-chain-verification/infrastructure/memwal-account-chain', () => ({
  MemWalAccountChain: class {
    isConfigured() { return true; }
    async findOwnedAccount() {
      if (chain.failing) throw new Error('Tatum unavailable');
      return chain.account;
    }
    async buildCreateAccountKind() { return Buffer.from('create-kind').toString('base64'); }
    async buildAddDelegateKind(_accountId: string, publicKey: string) {
      chain.addDelegateKeys.push(publicKey);
      return Buffer.from(`add-kind-${publicKey}`).toString('base64');
    }
  },
}));

const blobs = vi.hoisted(() => ({
  owned: null as null | { objectId: string; deletable: boolean },
  check: 'not_found' as 'confirmed' | 'not_found' | 'rejected',
  failing: false,
  lookups: [] as Array<{ wallet: string; blobId: string }>,
  built: [] as Array<{ wallet: string; objectId: string }>,
  checks: [] as Array<{ digest: string; wallet: string; blobId: string }>,
}));
vi.mock('@/modules/on-chain-verification/infrastructure/walrus-blob-deletion', () => ({
  WalrusBlobDeletion: class {
    isConfigured() { return true; }
    async findOwnedBlob(wallet: string, blobId: string) {
      blobs.lookups.push({ wallet, blobId });
      return blobs.owned;
    }
    async buildDeleteKind(wallet: string, objectId: string) {
      blobs.built.push({ wallet, objectId });
      return 'a2luZA==';
    }
    async checkDeletion(digest: string, wallet: string, blobId: string) {
      if (blobs.failing) throw new Error('Tatum unavailable');
      blobs.checks.push({ digest, wallet, blobId });
      return blobs.check;
    }
  },
}));

const walrusWrites = vi.hoisted(() => [] as string[]);
vi.mock('@mysten-incubation/memwal', async (importOriginal) => ({
  ...await importOriginal<typeof import('@mysten-incubation/memwal')>(),
  MemWal: {
    create: () => ({
      async remember(text: string, _namespace: string, options: { idempotencyKey: string }) {
        walrusWrites.push(text);
        return { job_id: options.idempotencyKey, status: 'accepted' };
      },
      destroy() {},
    }),
  },
}));

import { GET as accountGet, POST as accountPost } from '@/app/api/memory/account/route';
import { GET as deleteGet, POST as deletePost } from '@/app/api/memory/delete/route';
import { DELETE as hideRoute } from '@/app/api/memory/[id]/route';
import { POST as rememberRoute } from '@/app/api/memory/remember/route';
import { asWallet, createMigratedDatabase, deleteRequest, enableConsent, getRequest, giveReadyMemoryAccount, insertMemory, jsonRequest, signIn, TEST_VAULT_SECRET } from '../helpers/wallet-harness';

const ACCOUNT = `0x${'a'.repeat(64)}`;

async function dataOf(response: Response) {
  return (await response.json()).data;
}

/** The relayer's HTTP API, answering by path. Records every request. */
function stubRelayer(routes: Record<string, (body: Record<string, unknown>, init: RequestInit) => Response | Promise<Response>>) {
  const calls: Array<{ path: string; body: Record<string, unknown>; authorization?: string }> = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    const path = new URL(url).pathname;
    const body = init.body ? JSON.parse(init.body as string) : {};
    calls.push({ path, body, authorization: (init.headers as Record<string, string>).Authorization });
    const route = routes[path];
    if (!route) return Response.json({ error: `unexpected ${path}` }, { status: 404 });
    return route(body, init);
  }));
  return calls;
}

const setup = (body: unknown, cookie: string) => accountPost(jsonRequest('POST', '/api/memory/account', body, cookie));
const del = (body: unknown, cookie: string) => deletePost(jsonRequest('POST', '/api/memory/delete', body, cookie));

beforeAll(async () => {
  db.instance = await createMigratedDatabase();
});
afterAll(async () => {
  await db.instance?.close();
});
beforeEach(() => {
  vi.unstubAllGlobals();
  vi.stubEnv('MEMEORA_DELEGATE_KEY_SECRET', TEST_VAULT_SECRET);
  vi.stubEnv('TATUM_API_KEY', 'tatum-test-key');
  chain.account = null;
  chain.addDelegateKeys.length = 0;
  chain.failing = false;
  walrusWrites.length = 0;
  blobs.owned = null;
  blobs.check = 'not_found';
  blobs.failing = false;
  blobs.lookups.length = 0;
  blobs.built.length = 0;
  blobs.checks.length = 0;
});

describe('per-wallet Walrus account setup', () => {
  it('takes a new wallet through create, approve and ready, with the key stored encrypted', async () => {
    const keypair = new Ed25519Keypair();
    const wallet = keypair.toSuiAddress();
    const cookie = await signIn(keypair);
    await enableConsent(cookie);

    expect(await dataOf(await accountGet(getRequest('/api/memory/account', cookie)))).toMatchObject({ status: 'no_account' });

    const first = await dataOf(await setup({ action: 'next' }, cookie));
    expect(first.step).toBe('create_account');
    expect(first.authMessage).toContain(`sender: ${wallet}`);

    // The wallet is the only owner: a sender in the request is ignored in favour of the session.
    const calls = stubRelayer({
      '/sponsor': () => Response.json({ bytes: 'c3BvbnNvcmVk', digest: 'digest-1' }),
      '/sponsor/execute': () => Response.json({ digest: 'digest-1' }),
    });
    const sponsored = await setup({ action: 'sponsor', kindBytes: first.kindBytes, authNonce: first.authNonce, authTimestamp: first.authTimestamp, authSignature: 'sig', sender: `0x${'9'.repeat(64)}` }, cookie);
    expect(await dataOf(sponsored)).toEqual({ bytes: 'c3BvbnNvcmVk', digest: 'digest-1' });
    expect(calls[0].body).toMatchObject({ sender: wallet, transactionBlockKindBytes: first.kindBytes, authSignature: 'sig' });
    await setup({ action: 'execute', digest: 'digest-1', signature: 'sig2', sender: `0x${'9'.repeat(64)}` }, cookie);
    expect(calls[1].body).toEqual({ digest: 'digest-1', sender: wallet, signature: 'sig2' });

    // Account now exists on Sui: the next step registers a key, and repeating reuses it.
    chain.account = { accountId: ACCOUNT, owner: wallet, active: true, delegateAddresses: [] };
    expect((await dataOf(await setup({ action: 'next' }, cookie))).step).toBe('add_delegate');
    await setup({ action: 'next' }, cookie);
    expect(chain.addDelegateKeys).toHaveLength(2);
    expect(chain.addDelegateKeys[0]).toBe(chain.addDelegateKeys[1]);

    const row = await asWallet(db.instance!, wallet, async (userId) => (await db.instance!.query<{ delegate_address: string; encrypted_delegate_key: string; status: string }>(
      'SELECT delegate_address, encrypted_delegate_key, status FROM wallet_memory_accounts WHERE user_id = $1', [userId],
    )).rows[0]);
    expect(row.status).toBe('pending');
    expect(row.encrypted_delegate_key).toMatch(/^v1\./);
    expect(row.encrypted_delegate_key).not.toMatch(/^[0-9a-f]{64}$/);

    // Signed, but Sui does not list it yet: still blocked.
    const blocked = await rememberRoute(jsonRequest('POST', '/api/memory/remember', { category: 'goal', text: 'Save for a laptop' }, cookie));
    expect(blocked.status).toBe(409);
    expect(walrusWrites).toEqual([]);

    // Sui lists the key: ready, and saving works.
    chain.account.delegateAddresses = [row.delegate_address];
    expect((await dataOf(await setup({ action: 'next' }, cookie))).step).toBe('ready');
    const saved = await rememberRoute(jsonRequest('POST', '/api/memory/remember', { category: 'goal', text: 'Save for a laptop' }, cookie));
    expect(saved.status).toBe(202);
    expect(walrusWrites).toHaveLength(1);
  });

  it('skips creation for a wallet that already owns an account, and never adopts someone else\'s', async () => {
    const keypair = new Ed25519Keypair();
    const wallet = keypair.toSuiAddress();
    const cookie = await signIn(keypair);
    await enableConsent(cookie);

    chain.account = { accountId: ACCOUNT, owner: `0x${'7'.repeat(64)}`, active: true, delegateAddresses: [] };
    expect((await dataOf(await setup({ action: 'next' }, cookie))).step).toBe('create_account');

    chain.account = { accountId: ACCOUNT, owner: wallet, active: true, delegateAddresses: [] };
    expect((await dataOf(await setup({ action: 'next' }, cookie))).step).toBe('add_delegate');
  });

  it('stops saving when the owner removes the key, and a new key is issued after', async () => {
    const keypair = new Ed25519Keypair();
    const wallet = keypair.toSuiAddress();
    const cookie = await signIn(keypair);
    await enableConsent(cookie);
    await giveReadyMemoryAccount(db.instance!, wallet, ACCOUNT);

    chain.account = { accountId: ACCOUNT, owner: wallet, active: true, delegateAddresses: [] };
    expect((await dataOf(await accountGet(getRequest('/api/memory/account', cookie)))).status).toBe('needs_delegate');
    expect((await rememberRoute(jsonRequest('POST', '/api/memory/remember', { category: 'goal', text: 'After revocation' }, cookie))).status).toBe(409);

    await setup({ action: 'next' }, cookie);
    expect(chain.addDelegateKeys[0]).not.toBe('ab');
  });

  it('keeps a verified account usable through a chain outage, but does not start setup', async () => {
    const keypair = new Ed25519Keypair();
    const wallet = keypair.toSuiAddress();
    const cookie = await signIn(keypair);
    await enableConsent(cookie);

    chain.failing = true;
    expect(await dataOf(await accountGet(getRequest('/api/memory/account', cookie)))).toMatchObject({ status: 'unavailable' });
    expect((await setup({ action: 'next' }, cookie)).status).toBe(503);

    await giveReadyMemoryAccount(db.instance!, wallet, ACCOUNT);
    expect(await dataOf(await accountGet(getRequest('/api/memory/account', cookie)))).toMatchObject({ status: 'ready', unchecked: true });
  });

  it('requires a session and consent', async () => {
    expect((await accountGet(getRequest('/api/memory/account'))).status).toBe(401);
    const cookie = await signIn();
    expect((await setup({ action: 'next' }, cookie)).status).toBe(403);
    expect((await setup({ action: 'unknown' }, cookie)).status).toBe(400);
  });
});

describe('saving the same memory twice', () => {
  it('writes once, refuses the repeat, and brings a hidden memory back without a new write', async () => {
    const keypair = new Ed25519Keypair();
    const wallet = keypair.toSuiAddress();
    const cookie = await signIn(keypair);
    await enableConsent(cookie);
    await giveReadyMemoryAccount(db.instance!, wallet, ACCOUNT);
    const save = (text: string) => rememberRoute(jsonRequest('POST', '/api/memory/remember', { category: 'goal', text }, cookie));

    // PGlite is one session, so the lock's concurrency is not exercised here; the check-then-insert is.
    expect((await save('Keep a buffer of 3000')).status).toBe(202);
    const repeat = await save('keep a buffer of 3000');
    expect(repeat.status).toBe(409);
    expect((await repeat.json()).error.code).toBe('DUPLICATE_MEMORY');
    expect(walrusWrites).toHaveLength(1);

    const blobbed = await insertMemory(db.instance!, wallet, 'Already stored rule', 'blob-stored', 'confirmed');
    expect((await hideRoute(deleteRequest(`/api/memory/${blobbed}`, cookie), { params: Promise.resolve({ id: blobbed }) })).status).toBe(200);
    const restored = await save('Already stored rule');
    expect(restored.status).toBe(202);
    expect(await dataOf(restored)).toMatchObject({ id: blobbed, walrusStatus: 'confirmed', walrusBlobId: 'blob-stored' });
    expect(walrusWrites).toHaveLength(1);
  });
});

describe('permanent delete on Sui', () => {
  const DIGEST = '5'.repeat(44);

  async function signedIn() {
    const keypair = new Ed25519Keypair();
    const wallet = keypair.toSuiAddress();
    const cookie = await signIn(keypair);
    return { wallet, cookie };
  }

  const readRow = (wallet: string, id: string) => asWallet(db.instance!, wallet, async () => (await db.instance!.query<{ memory_text: string; walrus_status: string; walrus_deleted_at: Date | null; walrus_delete_digest: string | null }>(
    'SELECT memory_text, walrus_status, walrus_deleted_at, walrus_delete_digest FROM financial_memories WHERE id = $1', [id],
  )).rows[0]);

  it('builds for the session wallet, and marks deleted only when Sui shows it', async () => {
    const { wallet, cookie } = await signedIn();
    const id = await insertMemory(db.instance!, wallet, 'Duplicate rule text', 'blob-mine', 'confirmed');
    blobs.owned = { objectId: '0xblobobject', deletable: true };

    const ready = await dataOf(await del({ action: 'prepare', memoryId: id, wallet: '0xother' }, cookie));
    expect(ready).toMatchObject({ blobId: 'blob-mine', objectId: '0xblobobject' });
    expect(blobs.lookups).toEqual([{ wallet, blobId: 'blob-mine' }]);
    expect(blobs.built).toEqual([{ wallet, objectId: '0xblobobject' }]);

    // Signed, but Sui has not shown it: not deleted, text kept, tracked, and not prepared again.
    blobs.check = 'not_found';
    expect(await dataOf(await del({ action: 'confirm', memoryId: id, digest: DIGEST }, cookie))).toEqual({ state: 'pending', digest: DIGEST });
    expect(await readRow(wallet, id)).toMatchObject({ memory_text: 'Duplicate rule text', walrus_deleted_at: null, walrus_delete_digest: DIGEST });
    expect((await dataOf(await deleteGet(getRequest('/api/memory/delete', cookie)))).pending).toEqual([{ id, digest: DIGEST }]);
    expect((await (await del({ action: 'prepare', memoryId: id }, cookie)).json()).error.code).toBe('DELETE_IN_PROGRESS');

    // Sui shows it: the next page load settles it with no wallet involved.
    blobs.check = 'confirmed';
    expect(await dataOf(await deleteGet(getRequest('/api/memory/delete', cookie)))).toEqual({ hidden: [], pending: [] });
    expect(blobs.checks.at(-1)).toEqual({ digest: DIGEST, wallet, blobId: 'blob-mine' });
    const row = await readRow(wallet, id);
    expect(row).toMatchObject({ memory_text: '[permanently deleted]', walrus_status: 'superseded', walrus_delete_digest: DIGEST });
    expect(row.walrus_deleted_at).not.toBeNull();
    expect((await (await del({ action: 'prepare', memoryId: id }, cookie)).json()).error.code).toBe('NOTHING_TO_DELETE');
  });

  it('refuses a digest that is not this wallet deleting this blob', async () => {
    const { wallet, cookie } = await signedIn();
    const id = await insertMemory(db.instance!, wallet, 'Rule kept after a bad digest', 'blob-keep', 'confirmed');
    blobs.check = 'rejected';
    const refused = await del({ action: 'confirm', memoryId: id, digest: DIGEST }, cookie);
    expect(refused.status).toBe(409);
    expect((await refused.json()).error.code).toBe('DELETE_NOT_CONFIRMED');
    expect(await readRow(wallet, id)).toMatchObject({ memory_text: 'Rule kept after a bad digest', walrus_deleted_at: null, walrus_delete_digest: null });
    expect((await del({ action: 'confirm', memoryId: id, digest: 'not a digest' }, cookie)).status).toBe(400);
  });

  it('keeps a confirmed deletion tracked through a Sui outage, and frees a digest that never lands', async () => {
    const { wallet, cookie } = await signedIn();
    const id = await insertMemory(db.instance!, wallet, 'Rule during an outage', 'blob-outage', 'confirmed');
    blobs.failing = true;
    expect(await dataOf(await del({ action: 'confirm', memoryId: id, digest: DIGEST }, cookie))).toMatchObject({ state: 'pending' });
    expect((await dataOf(await deleteGet(getRequest('/api/memory/delete', cookie)))).pending).toHaveLength(1);

    blobs.failing = false;
    blobs.check = 'not_found';
    await asWallet(db.instance!, wallet, () => db.instance!.query("UPDATE financial_memories SET updated_at = NOW() - INTERVAL '1 hour' WHERE id = $1", [id]));
    expect((await dataOf(await deleteGet(getRequest('/api/memory/delete', cookie)))).pending).toEqual([]);
    expect((await readRow(wallet, id)).walrus_delete_digest).toBeNull();
  });

  it('explains a blob the wallet does not hold or cannot delete, and hides other wallets\' memories', async () => {
    const { wallet, cookie } = await signedIn();
    const other = await signedIn();
    const id = await insertMemory(db.instance!, wallet, 'Held somewhere else', 'blob-away', 'confirmed');
    const foreign = await insertMemory(db.instance!, other.wallet, 'Not yours at all', 'blob-foreign', 'confirmed');

    blobs.owned = null;
    expect((await (await del({ action: 'prepare', memoryId: id }, cookie)).json()).error.code).toBe('BLOB_NOT_IN_WALLET');
    blobs.owned = { objectId: '0xpermanent', deletable: false };
    expect((await (await del({ action: 'prepare', memoryId: id }, cookie)).json()).error.code).toBe('BLOB_NOT_DELETABLE');
    expect(blobs.built).toEqual([]);

    // RLS: another wallet's memory resolves to nothing, for both steps.
    expect((await (await del({ action: 'prepare', memoryId: foreign }, cookie)).json()).error.code).toBe('NOTHING_TO_DELETE');
    expect((await (await del({ action: 'confirm', memoryId: foreign, digest: DIGEST }, cookie)).json()).error.code).toBe('NOTHING_TO_DELETE');
    expect((await readRow(other.wallet, foreign)).walrus_delete_digest).toBeNull();
    expect((await del({ action: 'prepare', memoryId: 'nope' }, cookie)).status).toBe(400);
  });

  it('lists hidden memories still on Walrus, for this wallet only', async () => {
    const { wallet, cookie } = await signedIn();
    const other = await signedIn();
    const id = await insertMemory(db.instance!, wallet, 'Hidden but stored', 'blob-hidden', 'confirmed');
    await hideRoute(deleteRequest(`/api/memory/${id}`, cookie), { params: Promise.resolve({ id }) });

    expect((await dataOf(await deleteGet(getRequest('/api/memory/delete', cookie)))).hidden).toEqual([
      { id, text: 'Hidden but stored', category: 'goal', walrusBlobId: 'blob-hidden' },
    ]);
    expect((await dataOf(await deleteGet(getRequest('/api/memory/delete', other.cookie)))).hidden).toEqual([]);
    expect((await deleteGet(getRequest('/api/memory/delete'))).status).toBe(401);
  });
});
