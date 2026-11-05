/**
 * Pure rules for proving a Memeora memory on Sui Mainnet. A Walrus Memory write
 * leaves a Walrus `Blob` object on Sui, owned by this wallet as the MemWal account owner, with
 * metadata naming the namespace and the relayer job that wrote it. No provider
 * or framework imports.
 */

/** What Memeora claims about one of its memories. */
export interface ExpectedMemoryBlob {
  memoryId: string;
  /** Walrus blob ID (base64url), as returned by the relayer. */
  blobId: string;
  /** Namespace Memeora wrote it to: `memeora:<wallet address>`. */
  namespace: string;
  /** Relayer job Memeora recorded; null for memories imported from Walrus. */
  jobId: string | null;
}

/** What Sui Mainnet returned for the blob's object. */
export interface OnChainBlob {
  objectId: string;
  ownerAddress: string | null;
  previousTransaction: string | null;
  registeredEpoch: number | null;
  certifiedEpoch: number | null;
  storageEndEpoch: number | null;
  sizeBytes: number | null;
  /** The blob's `metadata` dynamic field (memwal_namespace, memwal_job_id, …). */
  metadata: Record<string, string>;
}

export interface MemoryAccountState {
  accountId: string;
  owner: string;
  /** Whether the server's delegate key is listed in the account's delegate_keys. */
  delegateRegistered: boolean;
}

export type MemoryProofStatus = 'verified' | 'mismatch' | 'not_found';

export interface MemoryBlobProof {
  memoryId: string;
  blobId: string;
  status: MemoryProofStatus;
  suiObjectId: string | null;
  transactionDigest: string | null;
  certifiedEpoch: number | null;
  storageEndEpoch: number | null;
  sizeBytes: number | null;
  onChainNamespace: string | null;
  /** Each check is true/false, or null when there is nothing to compare. */
  checks: {
    certified: boolean;
    ownedByMemWalAccountOwner: boolean;
    namespaceMatches: boolean;
    jobIdMatches: boolean | null;
  };
}

/** Walrus blob IDs are the base64url encoding of a little-endian u256; Sui stores the u256. */
export function blobIdToU256(blobId: string): string {
  const base64 = blobId.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  let value = BigInt(0);
  for (let i = binary.length - 1; i >= 0; i--) {
    value = value * BigInt(256) + BigInt(binary.charCodeAt(i));
  }
  return value.toString();
}

export function evaluateBlobProof(
  expected: ExpectedMemoryBlob,
  accountOwner: string,
  onChain: OnChainBlob | null,
): MemoryBlobProof {
  if (!onChain) {
    return {
      memoryId: expected.memoryId,
      blobId: expected.blobId,
      status: 'not_found',
      suiObjectId: null,
      transactionDigest: null,
      certifiedEpoch: null,
      storageEndEpoch: null,
      sizeBytes: null,
      onChainNamespace: null,
      checks: { certified: false, ownedByMemWalAccountOwner: false, namespaceMatches: false, jobIdMatches: expected.jobId ? false : null },
    };
  }

  const checks = {
    certified: onChain.certifiedEpoch !== null,
    ownedByMemWalAccountOwner: onChain.ownerAddress === accountOwner,
    namespaceMatches: onChain.metadata.memwal_namespace === expected.namespace,
    jobIdMatches: expected.jobId ? onChain.metadata.memwal_job_id === expected.jobId : null,
  };
  const passed = Object.values(checks).every((check) => check !== false);
  return {
    memoryId: expected.memoryId,
    blobId: expected.blobId,
    status: passed ? 'verified' : 'mismatch',
    suiObjectId: onChain.objectId,
    transactionDigest: onChain.previousTransaction,
    certifiedEpoch: onChain.certifiedEpoch,
    storageEndEpoch: onChain.storageEndEpoch,
    sizeBytes: onChain.sizeBytes,
    onChainNamespace: onChain.metadata.memwal_namespace ?? null,
    checks,
  };
}

export const MEMORY_PROOF_EXPLANATION = {
  proves:
    'Sui Mainnet (read through Tatum) holds a certified Walrus Blob object for each verified memory, owned by the MemWal account owner, whose on-chain metadata names this wallet\'s namespace and the exact relayer job Memeora recorded.',
  doesNotProve:
    'The memory text itself: Walrus stores it encrypted, so its content is not readable on chain. Hiding a memory in Memeora does not touch the blob; only a delete signed by the owner wallet removes it.',
} as const;
