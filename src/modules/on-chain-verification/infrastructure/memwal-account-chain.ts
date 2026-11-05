import { bcs } from '@mysten/sui/bcs';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { deriveDynamicFieldID, fromHex, normalizeSuiAddress, toBase64 } from '@mysten/sui/utils';
import { getServerConfig } from '@/lib/config/env';
import type { OnChainMemoryAccount } from '@/modules/financial-memory/domain/memory-account';
import { createTatumSuiGrpcClient, fromProtoValue, tatumCall } from './tatum-sui-grpc';

const SUI_CLOCK = '0x6';
const MEMWAL_ACCOUNT_TYPE_SUFFIX = '::account::MemWalAccount';
const CONFIG_CACHE_TTL_MS = 10 * 60_000;
const CALL = { timeout: 15_000 };

export const MEMEORA_DELEGATE_LABEL = 'Memeora';

interface RelayerConfig {
  packageId: string;
  registryId: string;
}

let cachedConfig: { url: string; at: number; config: RelayerConfig } | null = null;
const registryTables = new Map<string, string>();

function isNotFound(error: unknown): boolean {
  return error instanceof Error && /not.?found/i.test(error.message);
}

export interface MemWalAccountChainOptions {
  apiKey?: string;
  relayerUrl?: string;
  clientFactory?: (apiKey: string) => SuiGrpcClient;
  fetchImpl?: typeof fetch;
}

/**
 * Reads MemWal accounts from Sui Mainnet through Tatum, and builds the account
 * transactions the wallet will sign. The contract IDs come from the relayer's
 * live /config, because it only sponsors its own package.
 */
export class MemWalAccountChain {
  private readonly apiKey: string | undefined;
  private readonly relayerUrl: string;
  private readonly clientFactory: (apiKey: string) => SuiGrpcClient;
  private readonly fetchImpl: typeof fetch;
  private client: SuiGrpcClient | null = null;

  constructor(options: MemWalAccountChainOptions = {}) {
    const config = getServerConfig();
    this.apiKey = options.apiKey ?? config.tatumApiKey;
    this.relayerUrl = (options.relayerUrl ?? config.walrusRelayerUrl).replace(/\/$/, '');
    this.clientFactory = options.clientFactory ?? createTatumSuiGrpcClient;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  private getClient(): SuiGrpcClient {
    if (!this.apiKey) throw new Error('TATUM_API_KEY is not configured on the server.');
    this.client ??= this.clientFactory(this.apiKey);
    return this.client;
  }

  private async relayerConfig(): Promise<RelayerConfig> {
    if (cachedConfig && cachedConfig.url === this.relayerUrl && Date.now() - cachedConfig.at < CONFIG_CACHE_TTL_MS) {
      return cachedConfig.config;
    }
    const response = await this.fetchImpl(`${this.relayerUrl}/config`, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`Walrus Memory /config answered HTTP ${response.status}.`);
    const body = await response.json() as Partial<RelayerConfig> & { network?: string };
    if (!body.packageId || !body.registryId) throw new Error('Walrus Memory /config has no contract IDs.');
    if (body.network !== 'mainnet') throw new Error('The Walrus Memory relayer is not on Mainnet.');
    const config = { packageId: body.packageId, registryId: body.registryId };
    cachedConfig = { url: this.relayerUrl, at: Date.now(), config };
    return config;
  }

  /** The registry's owner → account table. It never changes for a given registry. */
  private async registryTable(registryId: string): Promise<string> {
    const known = registryTables.get(registryId);
    if (known) return known;
    const { object } = await tatumCall(() => this.getClient().ledgerService.getObject(
      { objectId: registryId, readMask: { paths: ['json'] } }, CALL,
    ).response);
    const json = fromProtoValue(object?.json) as { accounts?: { id?: string } } | null;
    const table = json?.accounts?.id;
    if (!table) throw new Error('The Walrus Memory registry has no accounts table.');
    registryTables.set(registryId, table);
    return table;
  }

  /** The account owned by this wallet according to Sui, or null if it has none. */
  async findOwnedAccount(wallet: string): Promise<OnChainMemoryAccount | null> {
    const owner = normalizeSuiAddress(wallet);
    const { registryId } = await this.relayerConfig();
    const table = await this.registryTable(registryId);
    const fieldId = deriveDynamicFieldID(table, 'address', bcs.Address.serialize(owner).toBytes());

    let accountId: string | undefined;
    try {
      const { object } = await tatumCall(() => this.getClient().ledgerService.getObject(
        { objectId: fieldId, readMask: { paths: ['json'] } }, CALL,
      ).response);
      accountId = (fromProtoValue(object?.json) as { value?: string } | null)?.value;
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
    if (!accountId) return null;

    const { object } = await tatumCall(() => this.getClient().ledgerService.getObject(
      { objectId: accountId, readMask: { paths: ['object_type', 'json'] } }, CALL,
    ).response);
    if (!object?.objectType?.endsWith(MEMWAL_ACCOUNT_TYPE_SUFFIX)) {
      throw new Error('The registry points at an object that is not a MemWalAccount.');
    }
    const json = fromProtoValue(object.json) as {
      owner?: string; active?: boolean; delegate_keys?: Array<{ sui_address?: string }>;
    };
    return {
      accountId,
      owner: normalizeSuiAddress(json.owner ?? ''),
      active: json.active !== false,
      delegateAddresses: (json.delegate_keys ?? [])
        .map((key) => key.sui_address)
        .filter((address): address is string => Boolean(address))
        .map((address) => normalizeSuiAddress(address)),
    };
  }

  private async toKindBytes(transaction: Transaction): Promise<string> {
    const bytes = await tatumCall(() => transaction.build({ client: this.getClient(), onlyTransactionKind: true }));
    return toBase64(bytes);
  }

  async buildCreateAccountKind(): Promise<string> {
    const { packageId, registryId } = await this.relayerConfig();
    const transaction = new Transaction();
    transaction.moveCall({
      target: `${packageId}::account::create_account`,
      arguments: [transaction.object(registryId), transaction.object(SUI_CLOCK)],
    });
    return this.toKindBytes(transaction);
  }

  async buildAddDelegateKind(accountId: string, publicKeyHex: string): Promise<string> {
    const { packageId, registryId } = await this.relayerConfig();
    const transaction = new Transaction();
    transaction.moveCall({
      target: `${packageId}::account::add_delegate_key`,
      arguments: [
        transaction.object(accountId),
        transaction.object(registryId),
        transaction.pure.vector('u8', Array.from(fromHex(publicKeyHex))),
        transaction.pure.string(MEMEORA_DELEGATE_LABEL),
        transaction.object(SUI_CLOCK),
      ],
    });
    return this.toKindBytes(transaction);
  }
}
