import { MemoryCategory } from '../../domain/memory-record';

export interface WalrusWriteInput {
  /**
   * Who the memory belongs to on Walrus: the verified wallet address for
   * wallet sessions. It selects the namespace, so it must come from the server
   * session, never from request input.
   */
  namespaceOwner: string;
  category: MemoryCategory;
  text: string;
  /**
   * Stable per memory (the local record id). The relayer collapses a retried
   * write with the same key onto the original job, so retries never pay twice.
   */
  idempotencyKey: string;
}

export interface WalrusWriteOutput {
  /**
   * pending: the relayer accepted the job (jobId set); it finishes in the
   * background. pending_retry: not accepted (unconfigured or unreachable).
   */
  status: 'pending' | 'pending_retry';
  jobId: string | null;
  namespace: string;
  warning?: string;
}

export interface WalrusJobStatus {
  /** done: stored and indexed (blobId set). failed: will never complete. */
  state: 'pending' | 'done' | 'failed';
  blobId?: string;
  error?: string;
}

export interface WalrusRecallInput {
  namespaceOwner: string;
  query: string;
  limit?: number;
}

export interface RecalledWalrusMemory {
  blobId: string;
  category: MemoryCategory;
  text: string;
  /** Semantic distance to the query; lower is closer. */
  distance: number;
  createdAt: Date | null;
}

export type WalrusRecallOutput =
  | { available: true; memories: RecalledWalrusMemory[] }
  | { available: false; reason: string };

export interface WalrusPort {
  /** Submits a consented memory to Walrus Memory and returns without waiting for storage. */
  writeMemory(input: WalrusWriteInput): Promise<WalrusWriteOutput>;

  /** Reads the current state of a submitted write. */
  getWriteStatus(jobId: string): Promise<WalrusJobStatus>;

  /** Semantic recall from the owner's namespace. `available: false` means Walrus did not answer. */
  recallMemories(input: WalrusRecallInput): Promise<WalrusRecallOutput>;
}
