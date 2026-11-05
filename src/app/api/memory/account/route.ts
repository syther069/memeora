import { NextRequest } from 'next/server';
import { generateDelegateKey } from '@mysten-incubation/memwal/account';
import { sponsorAuthorizationMessage } from '@mysten-incubation/memwal';
import { fromBase64 } from '@mysten/sui/utils';
import { jsonError, jsonSuccess } from '@/lib/api-response';
import { requireWalletSession } from '@/lib/auth/require-session';
import { withWalletTransaction } from '@/lib/postgres/wallet-transaction';
import { resolveMemoryAccountStatus } from '@/modules/financial-memory/domain/memory-account';
import { DelegateKeyVault } from '@/modules/financial-memory/infrastructure/delegate-key-vault';
import { PostgresMemoryAccountRepository, StoredMemoryAccountRow } from '@/modules/financial-memory/infrastructure/postgres-memory-account-repository';
import { PostgresMemoryRepository } from '@/modules/financial-memory/infrastructure/postgres-memory-repository';
import { RelayerError, RelayerWalletApi } from '@/modules/financial-memory/infrastructure/relayer-wallet-api';
import { MemWalAccountChain } from '@/modules/on-chain-verification/infrastructure/memwal-account-chain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Session = { userId: string; walletAddress: string };

const toHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const loadStored = (session: Session) => withWalletTransaction(session.walletAddress, (client) =>
  new PostgresMemoryAccountRepository(client).get(session.userId));

const setStored = (session: Session, status: StoredMemoryAccountRow['status']) => withWalletTransaction(session.walletAddress, (client) =>
  new PostgresMemoryAccountRepository(client).setStatus(session.userId, status));

/**
 * Reads Sui and brings the stored status in line with it: a key the owner has
 * removed stops being usable, and a key seen on chain becomes usable.
 */
async function syncStatus(session: Session, chain: MemWalAccountChain) {
  const stored = await loadStored(session);
  const onChain = await chain.findOwnedAccount(session.walletAddress);
  const status = resolveMemoryAccountStatus(session.walletAddress, stored, onChain);
  if (stored?.status === 'ready' && status !== 'ready') await setStored(session, 'revoked');
  if (stored && stored.status !== 'ready' && status === 'ready') await setStored(session, 'ready');
  return { status, stored, onChain };
}

/** Where setup stands. Called on every Memory page load. */
export async function GET(request: NextRequest) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const chain = new MemWalAccountChain();
  if (!chain.isConfigured() || !new DelegateKeyVault().isConfigured()) {
    return jsonSuccess({ status: 'not_configured' });
  }
  try {
    const { status, onChain } = await syncStatus(session, chain);
    return jsonSuccess({ status, accountId: onChain?.accountId ?? null });
  } catch {
    // Sui could not be read: what was already verified stands, and saving stays available.
    try {
      const stored = await loadStored(session);
      return jsonSuccess(stored?.status === 'ready'
        ? { status: 'ready', accountId: stored.accountId, unchecked: true }
        : { status: 'unavailable', accountId: null });
    } catch {
      return jsonError('SERVICE_UNAVAILABLE', 'Your Walrus account could not be checked.', 503);
    }
  }
}

/** The next transaction this wallet needs to sign. Safe to repeat. */
async function nextStep(session: Session) {
  const chain = new MemWalAccountChain();
  const vault = new DelegateKeyVault();
  if (!chain.isConfigured() || !vault.isConfigured()) {
    return jsonError('SERVICE_UNAVAILABLE', 'Walrus account setup is not configured on this server.', 503);
  }
  const consent = await withWalletTransaction(session.walletAddress, (client) =>
    new PostgresMemoryRepository(client).getConsent(session.userId));
  if (!consent) return jsonError('CONSENT_REQUIRED', 'Turn memory on first.', 403);

  const { status, stored, onChain } = await syncStatus(session, chain);
  if (status === 'ready') return jsonSuccess({ step: 'ready', accountId: onChain?.accountId });
  if (status === 'inactive') {
    return jsonError('ACCOUNT_INACTIVE', 'Your Walrus account is deactivated. Reactivate it in the Walrus Memory dashboard, then try again.', 409);
  }

  let step: 'create_account' | 'add_delegate';
  let kindBytes: string;
  if (status === 'no_account' || !onChain) {
    step = 'create_account';
    kindBytes = await chain.buildCreateAccountKind();
  } else {
    // Reuse a key still awaiting registration, so a retry never orphans one that may have landed.
    let publicKey = stored?.status === 'pending' && stored.accountId === onChain.accountId ? stored.delegatePublicKey : null;
    if (!publicKey) {
      const generated = await generateDelegateKey();
      publicKey = toHex(generated.publicKey);
      const owner = { userId: session.userId, accountId: onChain.accountId };
      const row = {
        accountId: onChain.accountId,
        delegatePublicKey: publicKey,
        delegateAddress: generated.suiAddress,
        encryptedDelegateKey: vault.encrypt(generated.privateKey, owner),
      };
      await withWalletTransaction(session.walletAddress, (client) =>
        new PostgresMemoryAccountRepository(client).savePending(session.userId, row));
    }
    step = 'add_delegate';
    kindBytes = await chain.buildAddDelegateKind(onChain.accountId, publicKey);
  }

  const authNonce = crypto.randomUUID();
  const authTimestamp = Math.floor(Date.now() / 1000);
  const authMessage = await sponsorAuthorizationMessage(session.walletAddress, fromBase64(kindBytes), authTimestamp, authNonce);
  return jsonSuccess({ step, kindBytes, authMessage, authNonce, authTimestamp });
}

export async function POST(request: NextRequest) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const text = (name: string) => (typeof body?.[name] === 'string' ? body[name] as string : '');

  try {
    switch (body?.action) {
      case 'next':
        return await nextStep(session);
      case 'sponsor': {
        const authTimestamp = Number(body.authTimestamp);
        if (!text('kindBytes') || !text('authNonce') || !text('authSignature') || !Number.isInteger(authTimestamp)) {
          return jsonError('VALIDATION_ERROR', 'The sponsorship request is incomplete.', 400);
        }
        return jsonSuccess(await new RelayerWalletApi().sponsor({
          kindBytes: text('kindBytes'),
          sender: session.walletAddress,
          authNonce: text('authNonce'),
          authSignature: text('authSignature'),
          authTimestamp,
        }));
      }
      case 'execute':
        if (!text('digest') || !text('signature')) return jsonError('VALIDATION_ERROR', 'The signed transaction is incomplete.', 400);
        return jsonSuccess(await new RelayerWalletApi().executeSponsored({
          digest: text('digest'),
          sender: session.walletAddress,
          signature: text('signature'),
        }));
      default:
        return jsonError('VALIDATION_ERROR', 'Unknown action.', 400);
    }
  } catch (error) {
    if (error instanceof RelayerError) {
      const tooMany = error.status === 429;
      return jsonError(error.code ?? 'WALRUS_RELAYER_ERROR', tooMany ? 'Walrus Memory is busy. Please wait a minute and try again.' : error.message, tooMany ? 429 : 502);
    }
    console.warn(`Walrus account setup failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    return jsonError('SERVICE_UNAVAILABLE', 'Sui Mainnet could not be read through Tatum. Nothing was changed. Please retry.', 503);
  }
}
