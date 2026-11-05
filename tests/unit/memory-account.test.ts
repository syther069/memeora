import { describe, expect, it } from 'vitest';
import { OnChainMemoryAccount, resolveMemoryAccountStatus, StoredMemoryAccount } from '@/modules/financial-memory/domain/memory-account';
import { DelegateKeyVault } from '@/modules/financial-memory/infrastructure/delegate-key-vault';

const WALLET = `0x${'1'.repeat(64)}`;
const ACCOUNT = `0x${'a'.repeat(64)}`;
const DELEGATE = `0x${'d'.repeat(64)}`;
const SECRET = Buffer.alloc(32, 9).toString('base64');
const OWNER = { userId: 'user-1', accountId: ACCOUNT };

const onChain = (overrides: Partial<OnChainMemoryAccount> = {}): OnChainMemoryAccount => ({
  accountId: ACCOUNT, owner: WALLET, active: true, delegateAddresses: [DELEGATE], ...overrides,
});
const stored: StoredMemoryAccount = { accountId: ACCOUNT, delegateAddress: DELEGATE, status: 'pending' };

describe('resolveMemoryAccountStatus', () => {
  it('is ready only when this wallet owns an active account listing Memeora\'s key', () => {
    expect(resolveMemoryAccountStatus(WALLET, stored, onChain())).toBe('ready');
  });

  it('does not take the stored status on trust', () => {
    expect(resolveMemoryAccountStatus(WALLET, { ...stored, status: 'ready' }, onChain({ delegateAddresses: [] }))).toBe('needs_delegate');
    expect(resolveMemoryAccountStatus(WALLET, { ...stored, status: 'ready' }, null)).toBe('no_account');
  });

  it('refuses an account owned by another wallet, or a stored key for another account', () => {
    expect(resolveMemoryAccountStatus(WALLET, stored, onChain({ owner: `0x${'2'.repeat(64)}` }))).toBe('no_account');
    expect(resolveMemoryAccountStatus(WALLET, { ...stored, accountId: `0x${'b'.repeat(64)}` }, onChain())).toBe('needs_delegate');
  });

  it('asks for a key when none is stored, and reports a deactivated account', () => {
    expect(resolveMemoryAccountStatus(WALLET, null, onChain())).toBe('needs_delegate');
    expect(resolveMemoryAccountStatus(WALLET, stored, onChain({ active: false }))).toBe('inactive');
  });
});

describe('DelegateKeyVault', () => {
  it('round-trips without the key appearing in the ciphertext, with a fresh IV each time', () => {
    const vault = new DelegateKeyVault(SECRET);
    const key = 'f'.repeat(64);
    const sealed = vault.encrypt(key, OWNER);
    expect(sealed).not.toContain(key);
    expect(vault.encrypt(key, OWNER)).not.toBe(sealed);
    expect(vault.decrypt(sealed, OWNER)).toBe(key);
  });

  it('refuses tampering, a row moved to another user or account, and a different secret', () => {
    const vault = new DelegateKeyVault(SECRET);
    const sealed = vault.encrypt('f'.repeat(64), OWNER);
    const [version, iv, tag, data] = sealed.split('.');
    const flipped = `${data[0] === 'A' ? 'B' : 'A'}${data.slice(1)}`;
    expect(() => vault.decrypt([version, iv, tag, flipped].join('.'), OWNER)).toThrow();
    expect(() => vault.decrypt(sealed, { ...OWNER, userId: 'user-2' })).toThrow();
    expect(() => vault.decrypt(sealed, { ...OWNER, accountId: `0x${'b'.repeat(64)}` })).toThrow();
    expect(() => new DelegateKeyVault(Buffer.alloc(32, 1).toString('base64')).decrypt(sealed, OWNER)).toThrow();
  });

  it('is not configured with a missing or wrong-length secret', () => {
    expect(new DelegateKeyVault('').isConfigured()).toBe(false);
    expect(new DelegateKeyVault(Buffer.alloc(16).toString('base64')).isConfigured()).toBe(false);
    expect(new DelegateKeyVault(SECRET).isConfigured()).toBe(true);
    expect(() => new DelegateKeyVault('').encrypt('x', OWNER)).toThrow(/MEMEORA_DELEGATE_KEY_SECRET/);
  });
});
