import { describe, expect, it } from 'vitest';
import { blobIdToU256 } from '@/modules/on-chain-verification/domain/memory-proof';
import { WalrusBlobDeletion } from '@/modules/on-chain-verification/infrastructure/walrus-blob-deletion';

const WALLET = `0x${'1'.repeat(64)}`;
const ORIGIN = `0x${'f'.repeat(64)}`;
// The duplicate blob from the live simulation.
const BLOB = 'l54YxrpJZvDrWthrIZiBJJX4q0wN4zF2syjZpXKMNJc';
const DIGEST = '5'.repeat(44);

/** A protobuf `Value`, as the gRPC json read mask returns it. */
function proto(value: unknown): unknown {
  if (typeof value === 'string') return { kind: { oneofKind: 'stringValue', stringValue: value } };
  if (typeof value === 'boolean') return { kind: { oneofKind: 'boolValue', boolValue: value } };
  return { kind: { oneofKind: 'structValue', structValue: { fields: Object.fromEntries(Object.entries(value as object).map(([k, v]) => [k, proto(v)])) } } };
}

const answer = <T,>(response: T) => ({ response: Promise.resolve(response) });

function fakeClient(options: {
  transaction?: unknown;
  transactionError?: Error;
  objects?: Array<{ objectId: string; objectType: string; json: unknown }>;
}) {
  return {
    ledgerService: {
      getObject: () => answer({ object: { objectType: `${ORIGIN}::system::System`, json: proto({ package_id: `0x${'a'.repeat(64)}` }) } }),
      getTransaction: () => {
        if (options.transactionError) return { response: Promise.reject(options.transactionError) };
        return answer({ transaction: options.transaction });
      },
    },
    stateService: { listOwnedObjects: () => answer({ objects: options.objects ?? [] }) },
  } as never;
}

const deletedEvent = (blobId: string, origin = ORIGIN) => ({ eventType: `${origin}::events::BlobDeleted`, json: proto({ blob_id: blobIdToU256(blobId) }) });
const executed = (overrides: { success?: boolean; sender?: string; events?: unknown[] } = {}) => ({
  effects: { status: { success: overrides.success ?? true } },
  transaction: { sender: overrides.sender ?? WALLET },
  events: { events: overrides.events ?? [deletedEvent(BLOB)] },
});
const check = (client: never) => new WalrusBlobDeletion({ apiKey: 'k', clientFactory: () => client }).checkDeletion(DIGEST, WALLET, BLOB);

describe('WalrusBlobDeletion.checkDeletion', () => {
  it('confirms Walrus\'s BlobDeleted event for this blob, in a successful transaction from this wallet', async () => {
    expect(await check(fakeClient({ transaction: executed() }))).toBe('confirmed');
  });

  it('rejects a failed transaction, another sender, or another blob', async () => {
    expect(await check(fakeClient({ transaction: executed({ success: false }) }))).toBe('rejected');
    expect(await check(fakeClient({ transaction: executed({ sender: `0x${'2'.repeat(64)}` }) }))).toBe('rejected');
    expect(await check(fakeClient({ transaction: executed({ events: [deletedEvent('zJUuBc9wHtn37LTW0wnv0MFm7SNkE3X5NwpIFk86qP4')] }) }))).toBe('rejected');
  });

  it('rejects a look-alike event from another package, and a burn with no event', async () => {
    expect(await check(fakeClient({ transaction: executed({ events: [deletedEvent(BLOB, `0x${'b'.repeat(64)}`)] }) }))).toBe('rejected');
    expect(await check(fakeClient({ transaction: executed({ events: [] }) }))).toBe('rejected');
  });

  it('separates a transaction Sui has not shown from a failed read', async () => {
    expect(await check(fakeClient({ transactionError: new Error('Transaction not found') }))).toBe('not_found');
    await expect(check(fakeClient({ transactionError: new Error('UNAVAILABLE') }))).rejects.toThrow('UNAVAILABLE');
  });
});

describe('WalrusBlobDeletion.findOwnedBlob', () => {
  const object = (blobId: string, deletable: boolean, objectType = `${ORIGIN}::blob::Blob`) => ({
    objectId: `0xobject-${blobId.slice(0, 4)}`, objectType, json: proto({ blob_id: blobIdToU256(blobId), deletable }),
  });
  const find = (objects: Array<{ objectId: string; objectType: string; json: unknown }>) =>
    new WalrusBlobDeletion({ apiKey: 'k', clientFactory: () => fakeClient({ objects }) }).findOwnedBlob(WALLET, BLOB);

  it('finds the wallet\'s Blob object and reports whether it is deletable', async () => {
    expect(await find([object(BLOB, true)])).toEqual({ objectId: `0xobject-${BLOB.slice(0, 4)}`, deletable: true });
    expect(await find([object(BLOB, false)])).toMatchObject({ deletable: false });
  });

  it('returns null when the wallet does not hold it, ignoring other object types', async () => {
    expect(await find([object('zJUuBc9wHtn37LTW0wnv0MFm7SNkE3X5NwpIFk86qP4', true)])).toBeNull();
    expect(await find([object(BLOB, true, '0x2::coin::Coin')])).toBeNull();
  });

  it('is not configured without a Tatum key', () => {
    expect(new WalrusBlobDeletion({ apiKey: '' }).isConfigured()).toBe(false);
  });
});
