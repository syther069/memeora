import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '../../../../lib/api-response';
import { TatumSuiClient } from '../../../../modules/on-chain-verification/infrastructure/tatum-sui-client';
import { SupportedSuiCheck } from '../../../../modules/on-chain-verification/domain/verification-types';
import { requireWalletSession } from '@/lib/auth/require-session';
import { loadReadyMemoryAccount } from '@/modules/financial-memory/infrastructure/wallet-memory-account';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const checkParam = searchParams.get('check') || 'checkpoint';
  const validChecks: SupportedSuiCheck[] = ['checkpoint', 'walrus-account'];

  if (!validChecks.includes(checkParam as SupportedSuiCheck)) {
    return jsonError(
      'VALIDATION_ERROR',
      `Unsupported Sui verification check: "${checkParam}". Supported: ${validChecks.join(', ')}`,
      400
    );
  }

  // The checkpoint is public chain data. The account check is about the signed-in wallet's own account.
  let accountId: string | undefined;
  if (checkParam === 'walrus-account') {
    const auth = await requireWalletSession(request);
    if (!auth.ok) return auth.response;
    try {
      accountId = (await loadReadyMemoryAccount(auth.session))?.accountId;
    } catch {
      return jsonError('SERVICE_UNAVAILABLE', 'Your Walrus account could not be loaded.', 503);
    }
  }

  const result = await new TatumSuiClient({ accountId }).executeRpcQuery(checkParam as SupportedSuiCheck);
  return jsonSuccess(result);
}
