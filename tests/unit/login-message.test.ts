import { afterEach, describe, expect, it, vi } from 'vitest';
import { appOrigin, buildLoginMessage } from '@/lib/auth/login-message';

const input = {
  address: `0x${'a'.repeat(64)}`,
  challengeId: '10000000-0000-4000-8000-000000000001',
  nonce: 'n'.repeat(43),
  issuedAt: new Date('2026-11-04T10:00:00.000Z'),
  expiresAt: new Date('2026-11-04T10:05:00.000Z'),
};

describe('wallet login message', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is exactly the text wallets sign; changing it breaks every pending sign-in', () => {
    vi.stubEnv('MEMEORA_APP_ORIGIN', 'https://memeora.example/some/path');
    expect(buildLoginMessage(input)).toBe([
      'Sign in to Memeora',
      'Origin: https://memeora.example',
      'Network: Sui Mainnet',
      `Address: 0x${'a'.repeat(64)}`,
      'Challenge: 10000000-0000-4000-8000-000000000001',
      `Nonce: ${'n'.repeat(43)}`,
      'Issued At: 2026-11-04T10:00:00.000Z',
      'Expires At: 2026-11-04T10:05:00.000Z',
      'Purpose: Authenticate to Memeora. This signature does not authorize a transaction.',
    ].join('\n'));
  });

  it('binds localhost in development and refuses to guess the origin in production', () => {
    vi.stubEnv('MEMEORA_APP_ORIGIN', '');
    vi.stubEnv('NODE_ENV', 'development');
    expect(appOrigin()).toBe('http://localhost:3000');
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => appOrigin()).toThrow('MEMEORA_APP_ORIGIN is required in production.');
  });
});
