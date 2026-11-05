import type { SuiGrpcClient } from '@mysten/sui/grpc';
import {
  ExpectedMemoryBlob,
  MemoryAccountState,
  MemoryBlobProof,
  OnChainBlob,
  blobIdToU256,
  evaluateBlobProof,
} from '../domain/memory-proof';
import { createTatumSuiGrpcClient, fromProtoValue, tatumCall } from './tatum-sui-grpc';

const MEMWAL_ACCOUNT_TYPE_SUFFIX = '::account::MemWalAccount';
const WALRUS_BLOB_TYPE_SUFFIX = '::blob::Blob';
const WALRUS_METADATA_TYPE_SUFFIX = '::metadata::Metadata';
// shortcut: blobs are found by paging the MemWal owner's objects, at most
// MAX_OWNER_PAGES × OWNER_PAGE_SIZE objects. Store each blob's Sui object ID
// once the owner holds more objects than that.
const OWNER_PAGE_SIZE = 500;
const MAX_OWNER_PAGES = 10;
/** A checked proof is reused this long, so reloading the page does not spend Tatum requests. */
const PROOF_CACHE_TTL_MS = 5 * 60_000;
const proofCache = new Map<string, { at: number; result: Extract<MemoryProofResult, { status: 'checked' }> }>();

export type MemoryProofResult =
  | { status: 'not_configured'; reason: string }
  | { status: 'unavailable'; reason: string }
  | { status: 'checked'; account: MemoryAccountState; proofs: MemoryBlobProof[] };

const asNumber = (value: unknown): number | null => (value === null || value === undefined ? null : Number(value));

export interface TatumMemoryProofOptions {
  apiKey?: string;
  /** The signed-in wallet's own MemWal account. */
  accountId: string;
  /** Sui address of Memeora's key for this wallet. */
  delegateAddress: string | null;
  timeoutMs?: number;
  clientFactory?: (apiKey: string) => SuiGrpcClient;
}

/** Proves Memeora memories against Sui Mainnet through Tatum's Sui gRPC gateway. Read-only. */
export class TatumMemoryProofs {
  private readonly apiKey: string | undefined;
  private readonly accountId: string;
  private readonly delegateAddress: string | null;
  private readonly timeoutMs: number;
  private readonly clientFactory: (apiKey: string) => SuiGrpcClient;

  constructor(options: TatumMemoryProofOptions) {
    this.apiKey = options.apiKey ?? process.env.TATUM_API_KEY?.trim();
    this.accountId = options.accountId;
    this.delegateAddress = options.delegateAddress;
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.clientFactory = options.clientFactory ?? createTatumSuiGrpcClient;
  }

  async prove(expected: ExpectedMemoryBlob[]): Promise<MemoryProofResult> {
    if (!this.apiKey || !this.accountId) {
      return { status: 'not_configured', reason: 'TATUM_API_KEY is not configured on the server, or this wallet has no Walrus account.' };
    }
    const cacheKey = JSON.stringify([this.accountId, expected]);
    const cached = proofCache.get(cacheKey);
    if (cached && Date.now() - cached.at < PROOF_CACHE_TTL_MS) return cached.result;

    const client = this.clientFactory(this.apiKey);
    const call = { timeout: this.timeoutMs };
    try {
      const account = await this.readAccount(client, call);
      const blobs = await this.findBlobs(client, call, account.owner, expected.map((e) => e.blobId));
      const result = {
        status: 'checked' as const,
        account,
        proofs: expected.map((e) => evaluateBlobProof(e, account.owner, blobs.get(e.blobId) ?? null)),
      };
      proofCache.set(cacheKey, { at: Date.now(), result });
      return result;
    } catch (error) {
      return { status: 'unavailable', reason: error instanceof Error ? error.message : 'Tatum Sui gRPC request failed.' };
    }
  }

  private async readAccount(client: SuiGrpcClient, call: { timeout: number }): Promise<MemoryAccountState> {
    const { object } = await tatumCall(() => client.ledgerService.getObject(
      { objectId: this.accountId, readMask: { paths: ['object_id', 'object_type', 'json'] } }, call,
    ).response);
    if (!object?.objectType?.endsWith(MEMWAL_ACCOUNT_TYPE_SUFFIX)) {
      throw new Error('This wallet\'s Walrus account is not a MemWalAccount object on Sui Mainnet.');
    }
    const json = fromProtoValue(object.json) as { owner?: string; delegate_keys?: Array<{ sui_address?: string }> };
    if (!json.owner) throw new Error('The MemWalAccount object has no owner field.');
    return {
      accountId: this.accountId,
      owner: json.owner,
      delegateRegistered: Boolean(this.delegateAddress && json.delegate_keys?.some((k) => k.sui_address === this.delegateAddress)),
    };
  }

  private async findBlobs(
    client: SuiGrpcClient,
    call: { timeout: number },
    owner: string,
    blobIds: string[],
  ): Promise<Map<string, OnChainBlob>> {
    const wanted = new Map(blobIds.map((id) => [blobIdToU256(id), id]));
    const found = new Map<string, Omit<OnChainBlob, 'metadata'>>();
    let pageToken: Uint8Array | undefined;
    for (let page = 0; page < MAX_OWNER_PAGES && found.size < wanted.size; page++) {
      const result = await tatumCall(() => client.stateService.listOwnedObjects({
        owner,
        pageSize: OWNER_PAGE_SIZE,
        pageToken,
        readMask: { paths: ['object_id', 'object_type', 'owner', 'previous_transaction', 'json'] },
      }, call).response);
      for (const object of result.objects) {
        if (!object.objectId || !object.objectType?.endsWith(WALRUS_BLOB_TYPE_SUFFIX)) continue;
        const json = fromProtoValue(object.json) as {
          blob_id?: string; registered_epoch?: unknown; certified_epoch?: unknown; size?: unknown; storage?: { end_epoch?: unknown };
        };
        const blobId = wanted.get(String(json.blob_id ?? ''));
        if (!blobId) continue;
        found.set(blobId, {
          objectId: object.objectId,
          ownerAddress: object.owner?.address ?? null,
          previousTransaction: object.previousTransaction ?? null,
          registeredEpoch: asNumber(json.registered_epoch),
          certifiedEpoch: asNumber(json.certified_epoch),
          storageEndEpoch: asNumber(json.storage?.end_epoch),
          sizeBytes: asNumber(json.size),
        });
      }
      if (!result.nextPageToken?.length) break;
      pageToken = result.nextPageToken;
    }

    // One blob at a time: the calls are paced to Tatum's rate limit anyway.
    const blobs = new Map<string, OnChainBlob>();
    for (const [blobId, blob] of found) {
      blobs.set(blobId, { ...blob, metadata: await this.readMetadata(client, call, blob.objectId) });
    }
    return blobs;
  }

  /** Reads the blob's `metadata` dynamic field: key/value pairs written by the MemWal relayer. */
  private async readMetadata(client: SuiGrpcClient, call: { timeout: number }, blobObjectId: string): Promise<Record<string, string>> {
    const { dynamicFields } = await tatumCall(() => client.stateService.listDynamicFields({
      parent: blobObjectId, pageSize: 10, readMask: { paths: ['field_id', 'value_type'] },
    }, call).response);
    const field = dynamicFields.find((f) => f.valueType?.endsWith(WALRUS_METADATA_TYPE_SUFFIX));
    if (!field?.fieldId) return {};
    const fieldId = field.fieldId;
    const { object } = await tatumCall(() => client.ledgerService.getObject({ objectId: fieldId, readMask: { paths: ['json'] } }, call).response);
    const json = fromProtoValue(object?.json) as { value?: { metadata?: { contents?: Array<{ key?: string; value?: string }> } } };
    return Object.fromEntries((json.value?.metadata?.contents ?? [])
      .filter((entry): entry is { key: string; value: string } => typeof entry.key === 'string' && typeof entry.value === 'string')
      .map((entry) => [entry.key, entry.value]));
  }
}
