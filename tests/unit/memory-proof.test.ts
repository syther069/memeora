import { describe, expect, it, vi } from 'vitest';
import { blobIdToU256, evaluateBlobProof, type OnChainBlob } from '@/modules/on-chain-verification/domain/memory-proof';
import { TatumMemoryProofs } from '@/modules/on-chain-verification/infrastructure/tatum-memory-proofs';
import { tatumCall } from '@/modules/on-chain-verification/infrastructure/tatum-sui-grpc';

const OWNER = `0x${'1'.repeat(64)}`;
const NAMESPACE = `memeora:0x${'2'.repeat(64)}`;
const expected = { memoryId: 'm1', blobId: '2lSTI6x0FVGBYJB6gYyl86THFjTI3_rR7QZLmP2SY14', namespace: NAMESPACE, jobId: 'job-1' };

function onChain(overrides: Partial<OnChainBlob> = {}): OnChainBlob {
  return {
    objectId: '0xblob', ownerAddress: OWNER, previousTransaction: 'digest1', registeredEpoch: 43, certifiedEpoch: 43,
    storageEndEpoch: 58, sizeBytes: 424, metadata: { memwal_namespace: NAMESPACE, memwal_job_id: 'job-1' }, ...overrides,
  };
}

describe('blobIdToU256', () => {
  it('matches the u256 Sui stores for a real Mainnet blob', () => {
    // Pair read from Sui Mainnet through Tatum (seeded memory #1).
    expect(blobIdToU256('2lSTI6x0FVGBYJB6gYyl86THFjTI3_rR7QZLmP2SY14'))
      .toBe('42693340118111571445666586925805526517048432663777977298665401205049097671898');
  });
});

describe('evaluateBlobProof', () => {
  it('verifies a certified blob in the right namespace from the recorded job', () => {
    const proof = evaluateBlobProof(expected, OWNER, onChain());
    expect(proof.status).toBe('verified');
    expect(proof).toMatchObject({ suiObjectId: '0xblob', transactionDigest: 'digest1', certifiedEpoch: 43, storageEndEpoch: 58 });
  });

  it('reports a mismatch for the wrong namespace, owner, job, or an uncertified blob', () => {
    expect(evaluateBlobProof(expected, OWNER, onChain({ metadata: { memwal_namespace: 'memeora:other', memwal_job_id: 'job-1' } })).checks.namespaceMatches).toBe(false);
    expect(evaluateBlobProof(expected, OWNER, onChain({ ownerAddress: `0x${'9'.repeat(64)}` })).status).toBe('mismatch');
    expect(evaluateBlobProof(expected, OWNER, onChain({ metadata: { memwal_namespace: NAMESPACE, memwal_job_id: 'job-2' } })).status).toBe('mismatch');
    expect(evaluateBlobProof(expected, OWNER, onChain({ certifiedEpoch: null })).status).toBe('mismatch');
  });

  it('skips the job check for memories imported from Walrus, and reports missing blobs', () => {
    const imported = evaluateBlobProof({ ...expected, jobId: null }, OWNER, onChain({ metadata: { memwal_namespace: NAMESPACE } }));
    expect(imported.status).toBe('verified');
    expect(imported.checks.jobIdMatches).toBeNull();
    expect(evaluateBlobProof(expected, OWNER, null).status).toBe('not_found');
  });
});

/** Wraps plain JSON as the protobuf Value the gRPC `json` read mask returns. */
function proto(value: unknown): unknown {
  if (Array.isArray(value)) return { kind: { oneofKind: 'listValue', listValue: { values: value.map(proto) } } };
  if (value && typeof value === 'object') {
    return { kind: { oneofKind: 'structValue', structValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, proto(v)])) } } };
  }
  return { kind: { oneofKind: typeof value === 'number' ? 'numberValue' : 'stringValue', [typeof value === 'number' ? 'numberValue' : 'stringValue']: value } };
}

function fakeClient(accountType = '0xpkg::account::MemWalAccount') {
  const u256 = blobIdToU256(expected.blobId);
  const getObject = vi.fn(({ objectId }: { objectId: string }) => ({
    response: Promise.resolve(objectId === '0xaccount'
      ? { object: { objectType: accountType, json: proto({ owner: OWNER, delegate_keys: [] }) } }
      : { object: { json: proto({ value: { metadata: { contents: [{ key: 'memwal_namespace', value: NAMESPACE }, { key: 'memwal_job_id', value: 'job-1' }] } } }) } }),
  }));
  const listOwnedObjects = vi.fn()
    .mockReturnValueOnce({ response: Promise.resolve({ objects: [{ objectId: '0xcoin', objectType: '0x2::coin::Coin' }], nextPageToken: new Uint8Array([1]) }) })
    .mockReturnValueOnce({ response: Promise.resolve({ objects: [{
      objectId: '0xblob', objectType: '0xwalrus::blob::Blob', owner: { address: OWNER }, previousTransaction: 'digest1',
      json: proto({ blob_id: u256, registered_epoch: 43, certified_epoch: 43, size: '424', storage: { end_epoch: 58 } }),
    }] }) });
  const listDynamicFields = vi.fn(() => ({ response: Promise.resolve({ dynamicFields: [{ fieldId: '0xfield', valueType: '0xwalrus::metadata::Metadata' }] }) }));
  return { ledgerService: { getObject }, stateService: { listOwnedObjects, listDynamicFields } } as never;
}

describe('TatumMemoryProofs', () => {
  it('pages the owner\'s objects, reads blob metadata, and proves the memory', async () => {
    const proofs = new TatumMemoryProofs({ apiKey: 'k', accountId: '0xaccount', delegateAddress: null, clientFactory: () => fakeClient() });
    const result = await proofs.prove([{ ...expected, memoryId: 'paged' }]);
    expect(result.status, JSON.stringify(result)).toBe('checked');
    if (result.status === 'checked') {
      expect(result.account).toEqual({ accountId: '0xaccount', owner: OWNER, delegateRegistered: false });
      expect(result.proofs[0]).toMatchObject({ status: 'verified', suiObjectId: '0xblob', onChainNamespace: NAMESPACE });
    }
  });

  it('refuses an account object that is not a MemWalAccount, and needs configuration', async () => {
    const wrong = new TatumMemoryProofs({ apiKey: 'k', accountId: '0xaccount', delegateAddress: null, clientFactory: () => fakeClient('0x2::coin::Coin') });
    expect(await wrong.prove([{ ...expected, memoryId: 'wrong-type' }])).toMatchObject({ status: 'unavailable' });
    expect(await new TatumMemoryProofs({ apiKey: '', accountId: '', delegateAddress: null }).prove([expected])).toMatchObject({ status: 'not_configured' });
  });
});

describe('tatumCall', () => {
  it('retries a rate-limited call and gives up on other errors', async () => {
    vi.useFakeTimers();
    try {
      const flaky = vi.fn().mockRejectedValueOnce(new Error('Received HTTP status code 429')).mockResolvedValueOnce('ok');
      const pending = tatumCall(flaky);
      await vi.runAllTimersAsync();
      expect(await pending).toBe('ok');
      expect(flaky).toHaveBeenCalledTimes(2);

      const broken = vi.fn().mockRejectedValue(new Error('NOT_FOUND'));
      const failing = tatumCall(broken).catch((error: Error) => error.message);
      await vi.runAllTimersAsync();
      expect(await failing).toBe('NOT_FOUND');
      expect(broken).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
