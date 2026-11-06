import { formatMinorUnits, type CurrencyCode } from '@/modules/finance/domain/money';
import { APP_MODE_HEADER, type AppMode } from '@/lib/app-mode';
import { localPeriod } from '@/lib/dates';

let activeMode: AppMode = 'personal';

/** Every finance request carries the active workspace. Set by the app session. */
export function setFinanceApiMode(mode: AppMode) {
  activeMode = mode;
}

export function getFinanceApiMode(): AppMode {
  return activeMode;
}

export function financeApiHeaders(): Record<string, string> {
  return { [APP_MODE_HEADER]: activeMode };
}

export interface ApiTransaction {
  id: string;
  type: 'income' | 'expense';
  amountMinor: number;
  currency: CurrencyCode;
  category: string;
  description: string;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  counterparty?: string | null;
  reference?: string | null;
  onChain?: {
    chain: string;
    txHash: string;
    coinType: string | null;
    assetSymbol: string | null;
    assetAmount: string | null;
    verified: boolean;
  } | null;
  fiatEstimated?: boolean;
}

export interface ApiBudget {
  id: string;
  period: string;
  amountMinor: number;
  currency: CurrencyCode;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSavingsGoal {
  id: string;
  name: string;
  targetAmountMinor: number;
  currentAmountMinor: number;
  currency: CurrencyCode;
  targetDate: string | null;
  status: 'active' | 'completed' | 'paused';
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
}

/** Exact totals for one currency in a period, summed by the server. */
export interface ApiPeriodTotals {
  currency: CurrencyCode;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
  transactionCount: number;
}

export class FinanceApiError extends Error {
  constructor(message: string, readonly offline = false, readonly status?: number) {
    super(message);
    this.name = 'FinanceApiError';
  }
}

/** A key for one logical write: the same content gets the same key, so a retry cannot duplicate it. */
export function createIdempotencyKeys() {
  let last: { body: string; key: string } | null = null;
  return (body: string) => {
    if (last?.body !== body) last = { body, key: globalThis.crypto.randomUUID() };
    return last.key;
  };
}

export interface FinanceApiInit extends RequestInit {
  /** Makes this write safe to repeat, and retries it once if the network drops. */
  idempotencyKey?: string;
}

export async function financeApi<T>(path: string, init?: FinanceApiInit): Promise<T> {
  const { idempotencyKey, ...requestInit } = init ?? {};
  const send = () => fetch(path, {
    ...requestInit,
    headers: {
      ...financeApiHeaders(),
      ...Object.fromEntries(new Headers(requestInit.headers).entries()),
      ...(requestInit.body ? { 'Content-Type': 'application/json' } : {}),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    cache: 'no-store',
  });

  let response: Response;
  try {
    try {
      response = await send();
    } catch (cause) {
      if (!idempotencyKey) throw cause;
      response = await send();
    }
  } catch {
    throw new FinanceApiError('Memeora could not reach the server. Your saved records are not affected. Please try again.', true);
  }

  let payload: { success?: boolean; data?: T; error?: { message?: string } };
  try {
    payload = await response.json();
  } catch {
    throw new FinanceApiError('The finance service returned an unreadable response.', false, response.status);
  }
  // An expired or revoked session goes back to sign-in; the session guard only checks on entry.
  if (response.status === 401 && typeof window !== 'undefined') window.location.replace(`${window.location.origin}/sign-in`);
  if (!response.ok || payload.success !== true || payload.data === undefined) {
    throw new FinanceApiError(
      payload.error?.message ?? 'The finance service could not complete this request.',
      false,
      response.status
    );
  }
  return payload.data;
}

export function currentPeriod(): string {
  return localPeriod();
}

export function formatMoney(amountMinor: number, currency: ApiTransaction['currency']): string {
  return formatMinorUnits(amountMinor, currency);
}
