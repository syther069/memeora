import type { NextRequest, NextResponse } from 'next/server';
import { jsonError } from '@/lib/api-response';
import { getVerifiedWalletSession, type VerifiedWalletSession } from '@/lib/auth/wallet-session';

/**
 * Resolves the wallet session for an API route, or the response to return:
 * 401 when there is no valid session, 503 when it could not be checked. A
 * database failure must never look like being signed out.
 */
export async function requireWalletSession(
  request: NextRequest,
): Promise<{ ok: true; session: VerifiedWalletSession } | { ok: false; response: NextResponse }> {
  try {
    const session = await getVerifiedWalletSession(request);
    if (session) return { ok: true, session };
    return { ok: false, response: jsonError('UNAUTHORIZED', 'Valid Sui wallet session required.', 401) as NextResponse };
  } catch {
    return { ok: false, response: jsonError('SERVICE_UNAVAILABLE', 'Your session could not be checked right now. Please try again.', 503) as NextResponse };
  }
}
