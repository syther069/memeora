import { TatumRpcPort } from '../application/ports/tatum-rpc-port';
import {
  RpcVerificationResult,
  SuiObjectSummary,
  SupportedSuiCheck,
  VerificationStatus,
  getVerificationExplanation,
} from '../domain/verification-types';
import { getServerConfig } from '../../../lib/config/env';
import { createTatumSuiGrpcClient } from './tatum-sui-grpc';

const MEMWAL_ACCOUNT_TYPE_SUFFIX = '::account::MemWalAccount';

interface SuiGrpcReader {
  ledgerService: {
    getServiceInfo(
      request: Record<string, never>,
      options: { meta: Record<string, string>; timeout: number }
    ): { response: Promise<{ chain?: string; chainId?: string; checkpointHeight?: bigint }> };
    getObject(
      request: { objectId: string; readMask: { paths: string[] } },
      options: { meta: Record<string, string>; timeout: number }
    ): {
      response: Promise<{
        object?: {
          objectId?: string;
          version?: bigint;
          digest?: string;
          objectType?: string;
          owner?: { kind?: number };
        };
      }>;
    };
  };
}

interface CachedResult {
  result: RpcVerificationResult;
  cachedAt: number;
}

const verificationCache = new Map<string, CachedResult>();

export interface TatumSuiClientOptions {
  apiKey?: string;
  /** The signed-in wallet's own MemWal account, for the `walrus-account` check. */
  accountId?: string;
  cacheTtlMs?: number;
  timeoutMs?: number;
  clientFactory?: () => SuiGrpcReader;
}

export class TatumSuiClient implements TatumRpcPort {
  private readonly apiKey: string | undefined;
  private readonly accountId: string | undefined;
  private readonly cacheTtlMs: number;
  private readonly timeoutMs: number;
  private readonly clientFactory: () => SuiGrpcReader;

  constructor(options?: TatumSuiClientOptions) {
    const config = getServerConfig();
    this.apiKey = options?.apiKey ?? config.tatumApiKey;
    this.accountId = options?.accountId;
    this.cacheTtlMs = options?.cacheTtlMs ?? 60000;
    this.timeoutMs = options?.timeoutMs ?? 5000;
    this.clientFactory = options?.clientFactory
      ?? (() => createTatumSuiGrpcClient(this.apiKey ?? '') as unknown as SuiGrpcReader);
  }

  async executeRpcQuery(check: SupportedSuiCheck): Promise<RpcVerificationResult> {
    const startTime = Date.now();
    const explanation = getVerificationExplanation(check);
    const cacheKey = `${check}:${this.accountId ?? ''}`;

    if (!this.apiKey || (check === 'walrus-account' && !this.accountId)) {
      return this.createResult({
        check,
        status: 'not_configured',
        rawResult: null,
        latencyMs: Date.now() - startTime,
        explanation: {
          proves: check === 'walrus-account'
            ? 'Not queried: this wallet has not set up its Walrus account, or TATUM_API_KEY is not configured on the server.'
            : 'Not queried: TATUM_API_KEY is not configured on the server.',
          doesNotProve: explanation.doesNotProve,
        },
        error: check === 'walrus-account' ? 'This wallet has no Walrus account set up in Memeora yet.' : 'Live Sui verification is not configured.',
      });
    }

    const cached = verificationCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < this.cacheTtlMs) {
      return {
        ...cached.result,
        cached: true,
        cachedAt: new Date(cached.cachedAt).toISOString(),
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - startTime,
      };
    }

    try {
      const client = this.clientFactory();
      const callOptions = {
        meta: { 'x-api-key': this.apiKey },
        timeout: this.timeoutMs,
      };

      if (check === 'checkpoint') {
        const info = await client.ledgerService.getServiceInfo({}, callOptions).response;
        const sequenceNumber = info.checkpointHeight?.toString();
        const isMainnet = info.chain?.toLowerCase() === 'mainnet';
        const result = this.createResult({
          check,
          status: isMainnet && sequenceNumber ? 'verified' : 'unexpected_network',
          sequenceNumber,
          rawResult: {
            chain: info.chain ?? null,
            chainId: info.chainId ?? null,
            checkpointHeight: sequenceNumber ?? null,
          },
          verified: Boolean(isMainnet && sequenceNumber),
          latencyMs: Date.now() - startTime,
          explanation,
          error: isMainnet && sequenceNumber ? undefined : 'The Tatum Sui endpoint did not identify a Mainnet checkpoint.',
        });
        if (result.verified) this.cacheResult(cacheKey, result);
        return result;
      }

      const response = await client.ledgerService.getObject(
        {
          objectId: this.accountId!,
          readMask: { paths: ['object_id', 'version', 'digest', 'object_type', 'owner'] },
        },
        callOptions
      ).response;
      const object = response.object;

      if (!object?.objectId || !object.objectType || object.version === undefined || !object.digest) {
        throw new Error('The Sui node returned an incomplete object response.');
      }

      const summary: SuiObjectSummary = {
        objectId: object.objectId,
        version: object.version.toString(),
        digest: object.digest,
        type: object.objectType,
        ...(object.owner?.kind !== undefined ? { ownerKind: object.owner.kind } : {}),
      };
      const isMemWalAccount = object.objectType.endsWith(MEMWAL_ACCOUNT_TYPE_SUFFIX);
      const result = this.createResult({
        check,
        status: isMemWalAccount ? 'verified' : 'unexpected_object',
        accountObject: summary,
        rawResult: { accountObject: summary },
        verified: isMemWalAccount,
        latencyMs: Date.now() - startTime,
        explanation,
        error: isMemWalAccount ? undefined : 'The configured object exists, but its Move type is not Walrus Memory MemWalAccount.',
      });
      if (isMemWalAccount) this.cacheResult(cacheKey, result);
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Tatum Sui gRPC request failed.';
      const isNotFound = /not.?found|NOT_FOUND/i.test(message);
      const cachedAfterFailure = verificationCache.get(cacheKey);
      if (cachedAfterFailure && Date.now() - cachedAfterFailure.cachedAt < this.cacheTtlMs) {
        return {
          ...cachedAfterFailure.result,
          cached: true,
          cachedAt: new Date(cachedAfterFailure.cachedAt).toISOString(),
          timestamp: new Date().toISOString(),
          latencyMs: Date.now() - startTime,
        };
      }

      return this.createResult({
        check,
        status: isNotFound ? 'not_found' : 'unavailable',
        rawResult: null,
        latencyMs: Date.now() - startTime,
        explanation: {
          proves: `Tatum Sui gRPC did not confirm this check: ${message}`,
          doesNotProve: explanation.doesNotProve,
        },
        error: isNotFound ? 'The configured on-chain object was not found.' : 'Tatum Sui gRPC is unavailable. Try again shortly.',
      });
    }
  }

  private createResult(input: {
    check: SupportedSuiCheck;
    status: VerificationStatus;
    rawResult: Record<string, unknown> | null;
    latencyMs: number;
    explanation: RpcVerificationResult['explanation'];
    verified?: boolean;
    sequenceNumber?: string;
    accountObject?: SuiObjectSummary;
    error?: string;
  }): RpcVerificationResult {
    return {
      network: 'sui-mainnet',
      check: input.check,
      method: input.check === 'checkpoint'
        ? 'sui.rpc.v2.LedgerService/GetServiceInfo'
        : 'sui.rpc.v2.LedgerService/GetObject',
      status: input.status,
      ...(input.sequenceNumber ? { sequenceNumber: input.sequenceNumber } : {}),
      ...(input.accountObject ? { accountObject: input.accountObject } : {}),
      rawResult: input.rawResult,
      verified: input.verified ?? input.status === 'verified',
      cached: false,
      timestamp: new Date().toISOString(),
      latencyMs: input.latencyMs,
      ...(input.error ? { error: input.error } : {}),
      explanation: input.explanation,
    };
  }

  private cacheResult(key: string, result: RpcVerificationResult): void {
    verificationCache.set(key, { result, cachedAt: Date.now() });
  }

  clearCache(): void {
    verificationCache.clear();
  }
}
