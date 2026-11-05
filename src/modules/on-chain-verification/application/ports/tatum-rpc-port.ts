import { SupportedSuiCheck, RpcVerificationResult } from '../../domain/verification-types';

export interface TatumRpcPort {
  /**
   * Execute an on-chain query to Sui Mainnet via Tatum RPC gateway.
   */
  executeRpcQuery(check: SupportedSuiCheck): Promise<RpcVerificationResult>;
}

