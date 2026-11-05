import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { getServerConfig } from '@/lib/config/env';
import { SuiTransactionFacts, SuiWalletEntry, walletEntries } from '../domain/sui-wallet-activity';
import { createTatumSuiGrpcClient, tatumCall } from './tatum-sui-grpc';

const PAGE_SIZE = 25;
const CALL_TIMEOUT_MS = 20_000;
const ORDERING_DESCENDING = 1;
const READ_PATHS = ['digest', 'timestamp', 'balance_changes', 'effects.status'];
const SUI_COIN_TYPE = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';

export interface CoinFacts {
  symbol: string;
  decimals: number;
}

const coinCache = new Map<string, CoinFacts | null>();

const PRUNED_HISTORY = /below earliest available; lowest available checkpoint is (\d+)/;
/** The oldest checkpoint the node still serves, learned from its own answer. */
let lowestAvailableCheckpoint: bigint | undefined;

interface RawExecutedTransaction {
  digest?: string;
  timestamp?: { seconds?: bigint | string; nanos?: number };
  balanceChanges?: Array<{ address?: string; coinType?: string; amount?: string }>;
  effects?: { status?: { success?: boolean } };
}

function toFacts(raw: RawExecutedTransaction | undefined): SuiTransactionFacts | null {
  if (!raw?.digest || raw.timestamp?.seconds === undefined) return null;
  return {
    digest: raw.digest,
    occurredAt: new Date(Number(raw.timestamp.seconds) * 1000),
    success: raw.effects?.status?.success === true,
    balanceChanges: raw.balanceChanges ?? [],
  };
}

export interface WalrusSuiHistoryOptions {
  apiKey?: string;
  clientFactory?: (apiKey: string) => SuiGrpcClient;
}

/** Reads a wallet's Sui activity through Tatum's gRPC gateway. Read-only. */
export class SuiWalletHistory {
  private readonly apiKey: string | undefined;
  private readonly clientFactory: (apiKey: string) => SuiGrpcClient;
  private client: SuiGrpcClient | null = null;

  constructor(options: WalrusSuiHistoryOptions = {}) {
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

  /**
   * A page of transactions touching the wallet, newest first, sent and received.
   * `affectedAddress` is only on the raw call; the SDK wrapper offers sender alone.
   */
  async listEntries(wallet: string, before?: string): Promise<{ entries: SuiWalletEntry[]; nextCursor: string | null }> {
    const collect = async () => {
      const call = this.getClient().ledgerService.listTransactions({
        filter: { terms: [{ literals: [{ negated: false, predicate: { oneofKind: 'affectedAddress', affectedAddress: { address: wallet } } }] }] },
        readMask: { paths: READ_PATHS },
        ...(lowestAvailableCheckpoint === undefined ? {} : { startCheckpoint: lowestAvailableCheckpoint }),
        options: {
          limit: PAGE_SIZE,
          ordering: ORDERING_DESCENDING,
          ...(before ? { before: Buffer.from(before, 'base64url') } : {}),
        },
      }, { timeout: CALL_TIMEOUT_MS });
      const entries: SuiWalletEntry[] = [];
      let count = 0;
      let cursor: Uint8Array | undefined;
      for await (const message of call.responses) {
        if (message.watermark?.cursor) cursor = message.watermark.cursor;
        const facts = toFacts(message.transaction as RawExecutedTransaction | undefined);
        if (!facts) continue;
        count += 1;
        entries.push(...walletEntries(wallet, facts));
      }
      // A short page means the wallet's history ended here.
      return { entries, nextCursor: cursor && count >= PAGE_SIZE ? Buffer.from(cursor).toString('base64url') : null };
    };
    try {
      return await tatumCall(collect);
    } catch (error) {
      // The node prunes old checkpoints, and a scan reaching that limit fails outright
      // rather than ending. Scan again from what the node says it still has.
      const lowest = error instanceof Error ? PRUNED_HISTORY.exec(error.message)?.[1] : undefined;
      if (!lowest) throw error;
      lowestAvailableCheckpoint = BigInt(lowest);
      return tatumCall(collect);
    }
  }

  /** One transaction's effect on the wallet. Null if Sui does not know the digest. */
  async readEntries(wallet: string, digest: string): Promise<SuiWalletEntry[] | null> {
    try {
      const { transaction } = await tatumCall(() => this.getClient().ledgerService.getTransaction(
        { digest, readMask: { paths: READ_PATHS } }, { timeout: CALL_TIMEOUT_MS },
      ).response);
      const facts = toFacts(transaction as RawExecutedTransaction | undefined);
      return facts ? walletEntries(wallet, facts) : null;
    } catch (error) {
      if (error instanceof Error && /not.?found/i.test(error.message)) return null;
      throw error;
    }
  }

  /** A token's symbol and decimals from chain metadata. Null if the chain has none. */
  async coinFacts(coinType: string): Promise<CoinFacts | null> {
    const known = coinCache.get(coinType);
    if (known !== undefined) return known;
    let facts: CoinFacts | null = null;
    try {
      const { metadata } = await tatumCall(() => this.getClient().stateService.getCoinInfo({ coinType }, { timeout: CALL_TIMEOUT_MS }).response);
      if (metadata?.decimals !== undefined && metadata.symbol) facts = { symbol: metadata.symbol, decimals: metadata.decimals };
    } catch (error) {
      if (!(error instanceof Error && /not.?found/i.test(error.message))) throw error;
    }
    if (!facts && coinType === SUI_COIN_TYPE) facts = { symbol: 'SUI', decimals: 9 };
    coinCache.set(coinType, facts);
    return facts;
  }
}
