import { getServerConfig } from '@/lib/config/env';

const REQUEST_TIMEOUT_MS = 20_000;

export class RelayerError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = 'RelayerError';
  }
}

/**
 * The relayer's gas sponsorship for account transactions. It is not open to
 * browsers, so these calls run on the server, always with the verified session
 * wallet as sender. Signatures passed here are never logged.
 */
export class RelayerWalletApi {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: { relayerUrl?: string; fetchImpl?: typeof fetch } = {}) {
    this.baseUrl = (options.relayerUrl ?? getServerConfig().walrusRelayerUrl).replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async request<T>(path: string, body: unknown): Promise<T> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new RelayerError('Walrus Memory did not respond.', 0);
    }
    const answer = await response.json().catch(() => null) as { error?: string; code?: string } | null;
    if (!response.ok) {
      throw new RelayerError(answer?.error || `Walrus Memory answered HTTP ${response.status}.`, response.status, answer?.code);
    }
    return answer as T;
  }

  sponsor(input: { kindBytes: string; sender: string; authNonce: string; authSignature: string; authTimestamp: number }) {
    const { kindBytes, ...rest } = input;
    return this.request<{ bytes: string; digest: string }>('/sponsor', { transactionBlockKindBytes: kindBytes, ...rest });
  }

  executeSponsored(input: { digest: string; sender: string; signature: string }) {
    return this.request<{ digest: string }>('/sponsor/execute', input);
  }
}
