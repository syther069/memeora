/** Pure result types for on-chain verification; no provider or framework imports. */

export type SupportedSuiCheck = 'checkpoint' | 'walrus-account';

export type VerificationStatus =
  | 'verified'
  | 'not_configured'
  | 'unavailable'
  | 'not_found'
  | 'unexpected_network'
  | 'unexpected_object';

export interface SuiObjectSummary {
  objectId: string;
  version: string;
  digest: string;
  type: string;
  ownerKind?: number;
}

export interface VerificationExplanation {
  proves: string;
  doesNotProve: string;
}

export interface RpcVerificationResult {
  network: 'sui-mainnet';
  check: SupportedSuiCheck;
  method: 'sui.rpc.v2.LedgerService/GetServiceInfo' | 'sui.rpc.v2.LedgerService/GetObject';
  status: VerificationStatus;
  sequenceNumber?: string;
  accountObject?: SuiObjectSummary;
  rawResult: Record<string, unknown> | null;
  verified: boolean;
  cached: boolean;
  cachedAt?: string;
  timestamp: string;
  latencyMs: number;
  error?: string;
  explanation: VerificationExplanation;
}

export function getVerificationExplanation(check: SupportedSuiCheck): VerificationExplanation {
  if (check === 'walrus-account') {
    return {
      proves: 'Tatum Sui Mainnet returned the configured object and its Move type matches a Walrus Memory MemWalAccount.',
      doesNotProve: 'The account object does not prove a namespace or memory blob exists, nor does it prove PostgreSQL ledger data.',
    };
  }

  return {
    proves: 'Tatum Sui Mainnet reported the latest executed checkpoint height through the Sui gRPC LedgerService.',
    doesNotProve: 'Checkpoint progression does not prove a Walrus memory write, an account object, or off-chain financial records.',
  };
}
