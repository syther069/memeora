/**
 * Pure Currency Value Object (Money)
 * Zero external dependencies. Performs all arithmetic in integer minor units (hundredths of the unit).
 */

export type CurrencyCode = 'USD' | 'USDC' | 'USDT' | 'SUI' | 'WAL' | 'OTHER';

export class Money {
  public readonly amountMinor: number;
  public readonly currency: CurrencyCode;

  private constructor(amountMinor: number, currency: CurrencyCode) {
    if (!Number.isSafeInteger(amountMinor)) {
      throw new Error(`Invalid minor unit amount: ${amountMinor}. Must be a safe integer.`);
    }
    this.amountMinor = amountMinor;
    this.currency = currency;
  }

  public static fromMinorUnits(amountMinor: number, currency: CurrencyCode = 'USD'): Money {
    return new Money(amountMinor, currency);
  }

  public static fromMajorUnits(amountMajor: number, currency: CurrencyCode = 'USD'): Money {
    if (!Number.isFinite(amountMajor)) {
      throw new Error(`Invalid major unit amount: ${amountMajor}.`);
    }
    return new Money(Math.round(amountMajor * 100), currency);
  }

  public static zero(currency: CurrencyCode = 'USD'): Money {
    return new Money(0, currency);
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: cannot operate on ${this.currency} and ${other.currency}.`);
    }
  }

  public add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountMinor + other.amountMinor, this.currency);
  }

  public subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountMinor - other.amountMinor, this.currency);
  }

  public isNegative(): boolean {
    return this.amountMinor < 0;
  }

  public toMajorUnits(): number {
    return this.amountMinor / 100;
  }

  public format(): string {
    return formatMinorUnits(this.amountMinor, this.currency);
  }
}


export const SUPPORTED_CURRENCIES: readonly CurrencyCode[] = ['USD', 'USDC', 'USDT', 'SUI', 'WAL', 'OTHER'];

export const CURRENCY_LABELS: Readonly<Record<CurrencyCode, string>> = { USD: 'USD $', USDC: 'USDC', USDT: 'USDT', SUI: 'SUI', WAL: 'WAL', OTHER: 'Other' };

/**
 * The one money formatter. Intl only accepts three-letter ISO codes, so tokens are written out.
 * shortcut: every currency keeps two decimals, so a token amount under 0.01 can't be a ledger value; exact on-chain amounts are stored separately.
 */
export function formatMinorUnits(amountMinor: number, currency: string): string {
  if (currency === 'USD') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amountMinor / 100);
  const number = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amountMinor / 100);
  return `${number} ${currency === 'OTHER' ? 'Other' : currency}`;
}

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && SUPPORTED_CURRENCIES.includes(value as CurrencyCode);
}

/**
 * Parses a user-typed major-unit amount ("1,500" or "1500.50") into positive
 * integer minor units without floating-point arithmetic. Returns null when the
 * text is not a positive amount with at most two decimal places.
 */
export function parseMajorUnitsToMinor(value: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim().replace(/,/g, ''));
  if (!match) return null;
  const minor = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0') || '0');
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}
