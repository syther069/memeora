/**
 * The exact text a wallet signs to sign in. The challenge route sends it and
 * the verify route rebuilds it to check the signature, so both must use this
 * one builder: any difference between them makes every sign-in fail.
 */
export interface LoginMessageInput {
  address: string;
  challengeId: string;
  nonce: string;
  issuedAt: Date;
  expiresAt: Date;
}

/** The public origin bound into the signed message. */
export function appOrigin(): string {
  const configured = process.env.MEMEORA_APP_ORIGIN?.trim();
  if (configured) return new URL(configured).origin;
  if (process.env.NODE_ENV !== 'production') return 'http://localhost:3000';
  throw new Error('MEMEORA_APP_ORIGIN is required in production.');
}

export function buildLoginMessage(input: LoginMessageInput): string {
  return [
    'Sign in to Memeora',
    `Origin: ${appOrigin()}`,
    'Network: Sui Mainnet',
    `Address: ${input.address}`,
    `Challenge: ${input.challengeId}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt.toISOString()}`,
    `Expires At: ${input.expiresAt.toISOString()}`,
    'Purpose: Authenticate to Memeora. This signature does not authorize a transaction.',
  ].join('\n');
}
