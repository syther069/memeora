import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { toBase64 } from '@mysten/sui/utils';
import { getServerConfig } from '@/lib/config/env';
import { blobIdToU256 } from '../domain/memory-proof';
import { createTatumSuiGrpcClient, fromProtoValue, tatumCall } from './tatum-sui-grpc';

/** Walrus Mainnet's system object, as in the official SDK's MAINNET_WALRUS_PACKAGE_CONFIG. */
export const WALRUS_MAINNET_SYSTEM_OBJECT = '0x2134d52768ea07e8c43570ef975eb3e4c27a39fa6396bef985b5abc58d03ddd2';

const BLOB_TYPE_SUFFIX = '::blob::Blob';
const OWNER_PAGE_SIZE = 500;
const MAX_OWNER_PAGES = 10;
const SYSTEM_CACHE_TTL_MS = 10 * 60_000;
const CALL = { timeout: 15_000 };

let cachedSystem: { at: number; packageId: string; originPackage: string } | null = null;

export interface OwnedBlob {
  objectId: string;
  deletable: boolean;
}

/** confirmed: Sui shows this wallet deleted this blob. not_found: no such transaction yet. rejected: it did not. */
export type DeletionCheck = 'confirmed' | 'not_found' | 'rejected';

export interface WalrusBlobDeletionOptions {
  apiKey?: string;
  clientFactory?: (apiKey: string) => SuiGrpcClient;
}

/**
 * Deleting a deletable Walrus blob directly on Sui. Its owner signs and pays gas;
 * the relayer plays no part. A deletion counts only when Sui shows a successful
 * transaction from this wallet carrying Walrus's own BlobDeleted event for this
 * blob. Burning the object, or an event from another package, does not count.
 */
export class WalrusBlobDeletion {
  private readonly apiKey: string | undefined;
  private readonly clientFactory: (apiKey: string) => SuiGrpcClient;
  private client: SuiGrpcClient | null = null;

  constructor(options: WalrusBlobDeletionOptions = {}) {
    this.apiKey = options.apiKey ?? getServerConfig().tatumApiKey;
    this.clientFactory = options.clientFactory ?? createTatumSuiGrpcClient;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  private getClient(): SuiGrpcClient {
    if (!this.apiKey) throw new Error('TATUM_API_KEY is not configured on the server.');
    this.client ??= this.clientFactory(this.apiKey);
    return this.client;
  }

  /** The current Walrus package to call, and the original one its types and events carry. */
  private async system() {
    if (cachedSystem && Date.now() - cachedSystem.at < SYSTEM_CACHE_TTL_MS) return cachedSystem;
    const { object } = await tatumCall(() => this.getClient().ledgerService.getObject(
      { objectId: WALRUS_MAINNET_SYSTEM_OBJECT, readMask: { paths: ['object_type', 'json'] } }, CALL,
    ).response);
    const json = fromProtoValue(object?.json) as { package_id?: string } | null;
    const originPackage = object?.objectType?.split('::')[0];
    if (!json?.package_id || !originPackage) throw new Error('The Walrus system object could not be read.');
    cachedSystem = { at: Date.now(), packageId: json.package_id, originPackage };
    return cachedSystem;
  }

  /** The wallet's Blob object for this blob ID, or null if the wallet does not hold it. */
  async findOwnedBlob(wallet: string, blobId: string): Promise<OwnedBlob | null> {
    const wanted = blobIdToU256(blobId);
    let pageToken: Uint8Array | undefined;
    for (let page = 0; page < MAX_OWNER_PAGES; page++) {
      const result = await tatumCall(() => this.getClient().stateService.listOwnedObjects({
        owner: wallet,
        pageSize: OWNER_PAGE_SIZE,
        pageToken,
        readMask: { paths: ['object_id', 'object_type', 'json'] },
      }, CALL).response);
      for (const object of result.objects) {
        if (!object.objectId || !object.objectType?.endsWith(BLOB_TYPE_SUFFIX)) continue;
        const json = fromProtoValue(object.json) as { blob_id?: unknown; deletable?: unknown };
        if (String(json.blob_id ?? '') === wanted) return { objectId: object.objectId, deletable: json.deletable === true };
      }
      if (!result.nextPageToken?.length) return null;
      pageToken = result.nextPageToken;
    }
    return null;
  }

  /** delete_blob returns the blob's Storage resource, which goes back to the owner. */
  async buildDeleteKind(wallet: string, blobObjectId: string): Promise<string> {
    const { packageId } = await this.system();
    const transaction = new Transaction();
    const storage = transaction.moveCall({
      package: packageId,
      module: 'system',
      function: 'delete_blob',
      arguments: [transaction.object(WALRUS_MAINNET_SYSTEM_OBJECT), transaction.object(blobObjectId)],
    });
    transaction.transferObjects([storage], wallet);
    return toBase64(await tatumCall(() => transaction.build({ client: this.getClient(), onlyTransactionKind: true })));
  }

  async checkDeletion(digest: string, wallet: string, blobId: string): Promise<DeletionCheck> {
    const { originPackage } = await this.system();
    let transaction;
    try {
      ({ transaction } = await tatumCall(() => this.getClient().ledgerService.getTransaction(
        { digest, readMask: { paths: ['transaction', 'effects', 'events'] } }, CALL,
      ).response));
    } catch (error) {
      if (error instanceof Error && /not.?found/i.test(error.message)) return 'not_found';
      throw error;
    }
    if (!transaction?.effects?.status?.success || transaction.transaction?.sender !== wallet) return 'rejected';

    const deletedType = `${originPackage}::events::BlobDeleted`;
    const wanted = blobIdToU256(blobId);
    const deleted = (transaction.events?.events ?? []).some((event) =>
      event.eventType === deletedType
      && String((fromProtoValue(event.json) as { blob_id?: unknown } | null)?.blob_id ?? '') === wanted);
    return deleted ? 'confirmed' : 'rejected';
  }
}
