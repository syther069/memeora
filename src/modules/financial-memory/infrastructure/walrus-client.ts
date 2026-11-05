import { createHash } from 'node:crypto';
import { MemWal } from '@mysten-incubation/memwal';
import type { MemWal as MemWalInstance } from '@mysten-incubation/memwal';
import {
  RecalledWalrusMemory,
  WalrusJobStatus,
  WalrusPort,
  WalrusRecallInput,
  WalrusRecallOutput,
  WalrusWriteInput,
  WalrusWriteOutput,
} from '../application/ports/walrus-port';
import { MemoryCategory } from '../domain/memory-record';
import { getServerConfig } from '../../../lib/config/env';
import type { AppMode } from '../../../lib/app-mode';

export interface WalrusClientOptions {
  relayerUrl?: string;
  namespace?: string;
  key?: string;
  accountId?: string;
  /** Which workspace's memories this client reads and writes. */
  mode?: AppMode;
  timeoutMs?: number;
  /** Waits between recall attempts while a new client's decrypt session warms up. */
  recallRetryDelaysMs?: number[];
  createClient?: (config: Parameters<typeof MemWal.create>[0]) => MemWalInstance;
}

const CATEGORY_PREFIX = /^Memeora category: (goal|preference|budget)\. /;

/** Memories are stored as "Memeora category: <c>. <text>" so the category survives recall. */
export function formatMemoryText(category: MemoryCategory, text: string): string {
  return `Memeora category: ${category}. ${text}`;
}

export function parseMemoryText(text: string): { text: string; category: MemoryCategory } {
  const match = CATEGORY_PREFIX.exec(text);
  if (match) {
    return { text: text.slice(match[0].length), category: match[1] as MemoryCategory };
  }
  return { text, category: 'preference' };
}

/**
 * A new SDK client's first recalls come back with every match dropped, measured
 * live: 5 of 5 fresh clients, while one client kept alive answered from a few
 * seconds on. So recall keeps one client per wallet key, and retries while it warms.
 */
const DEFAULT_RECALL_RETRY_DELAYS_MS = [1500, 3000, 4500];
const RECALL_CLIENT_TTL_MS = 10 * 60_000;
const RECALL_CLIENT_LIMIT = 200;
const recallClients = new Map<string, { client: MemWalInstance; expiresAt: number }>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class WalrusClient implements WalrusPort {
  private readonly relayerUrl: string;
  private readonly namespace: string;
  private readonly key: string | undefined;
  private readonly accountId: string | undefined;
  private readonly mode: AppMode;
  private readonly timeoutMs: number;
  private readonly createClient: (config: Parameters<typeof MemWal.create>[0]) => MemWalInstance;
  private readonly usesInjectedClient: boolean;
  private readonly recallRetryDelaysMs: number[];

  constructor(options?: WalrusClientOptions) {
    const config = getServerConfig();
    this.relayerUrl = options?.relayerUrl || config.walrusRelayerUrl;
    this.namespace = options?.namespace || config.walrusNamespace;
    // Per wallet, always: there is no shared account to fall back to.
    this.key = options?.key;
    this.accountId = options?.accountId;
    this.mode = options?.mode ?? 'personal';
    // Accepting a job and reading its status are quick relayer calls; storage
    // itself (about 20 s on Mainnet) happens in the background job.
    this.timeoutMs = options?.timeoutMs ?? 10_000;
    this.createClient = options?.createClient ?? ((clientConfig) => MemWal.create(clientConfig));
    this.usesInjectedClient = Boolean(options?.createClient);
    this.recallRetryDelaysMs = options?.recallRetryDelaysMs ?? DEFAULT_RECALL_RETRY_DELAYS_MS;
  }

  private isConfigured(): boolean {
    return Boolean(this.key && this.accountId);
  }

  /**
   * One namespace per owner (the verified wallet address) and workspace, inside
   * Memeora's prefix. Personal keeps the original form, so existing memories stay found.
   */
  namespaceFor(owner: string): string {
    const base = `${this.namespace}:${encodeURIComponent(owner)}`;
    return this.mode === 'business' ? `${base}:business` : base;
  }

  private getClient(): MemWalInstance {
    if (!this.key || !this.accountId) {
      throw new Error('Walrus Memory credentials are not configured.');
    }

    return this.createClient({
      key: this.key,
      accountId: this.accountId,
      serverUrl: this.relayerUrl,
      namespace: this.namespace,
      requestTimeoutMs: this.timeoutMs,
      recallTimeoutMs: this.timeoutMs,
      preflightTimeoutMs: Math.min(this.timeoutMs, 5000),
    });
  }

  /** The kept-alive client for this key. The map key is a hash, so no key sits in it as text. */
  private getRecallClient(): MemWalInstance {
    if (this.usesInjectedClient) return this.getClient();
    const cacheKey = createHash('sha256').update(`${this.relayerUrl}|${this.accountId}|${this.key}`).digest('hex');
    const now = Date.now();
    const cached = recallClients.get(cacheKey);
    if (cached && cached.expiresAt > now) return cached.client;
    if (cached) cached.client.destroy();
    recallClients.delete(cacheKey);
    if (recallClients.size >= RECALL_CLIENT_LIMIT) {
      const oldest = recallClients.keys().next().value;
      if (oldest) {
        recallClients.get(oldest)?.client.destroy();
        recallClients.delete(oldest);
      }
    }
    const client = this.getClient();
    recallClients.set(cacheKey, { client, expiresAt: now + RECALL_CLIENT_TTL_MS });
    return client;
  }

  async writeMemory(input: WalrusWriteInput): Promise<WalrusWriteOutput> {
    const namespace = this.namespaceFor(input.namespaceOwner);
    if (!this.isConfigured()) {
      return {
        status: 'pending_retry',
        jobId: null,
        namespace,
        warning: 'Walrus Memory credentials unconfigured; memory queued locally for retry.',
      };
    }

    const client = this.getClient();
    try {
      const accepted = await client.remember(formatMemoryText(input.category, input.text), namespace, {
        idempotencyKey: input.idempotencyKey,
        // Identical text resolves to the live memory instead of a second paid blob.
        dedupe: true,
      });
      return { status: 'pending', jobId: accepted.job_id, namespace };
    } catch (error: unknown) {
      const isTimeout = error instanceof Error && /timeout|timed out|abort/i.test(error.message);
      return {
        status: 'pending_retry',
        jobId: null,
        namespace,
        warning: isTimeout
          ? `Walrus Memory did not accept the write within ${this.timeoutMs}ms; it will be retried.`
          : 'Walrus Memory is unavailable; the write will be retried.',
      };
    } finally {
      client.destroy();
    }
  }

  async getWriteStatus(jobId: string): Promise<WalrusJobStatus> {
    if (!this.isConfigured()) return { state: 'pending' };
    const client = this.getClient();
    try {
      const job = await client.getRememberStatus(jobId);
      if (job.status === 'done' && job.blob_id) return { state: 'done', blobId: job.blob_id };
      if (job.status === 'failed' || job.status === 'not_found') {
        return { state: 'failed', error: job.error ?? job.status };
      }
      return { state: 'pending' };
    } catch {
      // A status lookup that cannot reach the relayer says nothing about the job.
      return { state: 'pending' };
    } finally {
      client.destroy();
    }
  }

  async recallMemories(input: WalrusRecallInput): Promise<WalrusRecallOutput> {
    if (!this.isConfigured()) return { available: false, reason: 'Walrus Memory credentials are not configured.' };

    const client = this.getRecallClient();
    try {
      const recallOnce = () => client.recall({
        query: input.query.trim() || 'financial goals, preferences, and budget guidance',
        limit: input.limit ?? 5,
        namespace: this.namespaceFor(input.namespaceOwner),
        timeoutMs: this.timeoutMs,
      });
      let result = await recallOnce();
      for (const delay of this.recallRetryDelaysMs) {
        if (!result.dropped_count) break;
        await sleep(delay);
        result = await recallOnce();
      }
      // Matches Walrus Memory found but could not download or decrypt: this is
      // not a complete answer, so it must not decide which rules apply.
      if (result.dropped_count) {
        return { available: false, reason: `Walrus Memory could not read ${result.dropped_count} matching memories.` };
      }
      const memories: RecalledWalrusMemory[] = result.results.map((item) => ({
        blobId: item.blob_id,
        ...parseMemoryText(item.text),
        distance: item.distance,
        createdAt: item.created_at ? new Date(item.created_at) : null,
      }));
      return { available: true, memories };
    } catch (error: unknown) {
      return { available: false, reason: error instanceof Error ? error.message : 'Walrus recall failed.' };
    } finally {
      // The kept-alive client stays open for the next question.
      if (this.usesInjectedClient) client.destroy();
    }
  }
}
