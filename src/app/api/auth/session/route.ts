import { NextRequest } from 'next/server';
import { jsonError, jsonSuccess } from '@/lib/api-response';
import { getVerifiedWalletSession } from '@/lib/auth/wallet-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  let walletSession;
  try {
    walletSession = await getVerifiedWalletSession(request);
  } catch {
    return jsonError('SERVICE_UNAVAILABLE', 'Your session could not be checked right now.', 503);
  }
  return jsonSuccess({
    authenticated: Boolean(walletSession),
    mode: process.env.DATABASE_URL ? 'wallet' as const : 'unavailable' as const,
    walletAddress: walletSession?.walletAddress ?? null,
    userId: walletSession?.userId ?? null,
  });
}
