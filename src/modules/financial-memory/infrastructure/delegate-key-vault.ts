import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const VERSION = 'v1';
const KEY_BYTES = 32;
const IV_BYTES = 12;

export interface DelegateKeyOwner {
  userId: string;
  accountId: string;
}

/**
 * Encrypts each wallet's Walrus delegate key with AES-256-GCM. The ciphertext is
 * bound to its user and account, so a row copied onto another account will not
 * decrypt. The secret (MEMEORA_DELEGATE_KEY_SECRET) stays outside the database.
 */
export class DelegateKeyVault {
  private readonly key: Buffer | null;

  constructor(secret: string | undefined = process.env.MEMEORA_DELEGATE_KEY_SECRET) {
    const decoded = secret ? Buffer.from(secret.trim(), 'base64') : null;
    this.key = decoded?.length === KEY_BYTES ? decoded : null;
  }

  isConfigured(): boolean {
    return this.key !== null;
  }

  private requireKey(): Buffer {
    if (!this.key) throw new Error('MEMEORA_DELEGATE_KEY_SECRET must be 32 bytes, base64 encoded.');
    return this.key;
  }

  private static binding({ userId, accountId }: DelegateKeyOwner): Buffer {
    return Buffer.from(`memeora-delegate-key:${VERSION}:${userId}:${accountId}`, 'utf8');
  }

  encrypt(privateKey: string, owner: DelegateKeyOwner): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', this.requireKey(), iv);
    cipher.setAAD(DelegateKeyVault.binding(owner));
    const ciphertext = Buffer.concat([cipher.update(privateKey, 'utf8'), cipher.final()]);
    return [VERSION, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join('.');
  }

  decrypt(sealed: string, owner: DelegateKeyOwner): string {
    const [version, iv, tag, ciphertext] = sealed.split('.');
    if (version !== VERSION || !iv || !tag || !ciphertext) throw new Error('The stored delegate key has an unknown format.');
    const decipher = createDecipheriv('aes-256-gcm', this.requireKey(), Buffer.from(iv, 'base64url'));
    decipher.setAAD(DelegateKeyVault.binding(owner));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8');
  }
}
