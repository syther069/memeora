/**
 * Pure Currency Value Object (Money)
 * Zero external dependencies. Performs all arithmetic in integer minor units (paise/cents).
 */

export type CurrencyCode = 'INR' | 'USD';

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

  public static fromMinorUnits(amountMinor: number, currency: CurrencyCode = 'INR'): Money {
    return new Money(amountMinor, currency);
  }

  public static fromMajorUnits(amountMajor: number, currency: CurrencyCode = 'INR'): Money {
    if (!Number.isFinite(amountMajor)) {
      throw new Error(`Invalid major unit amount: ${amountMajor}.`);
    }
    return new Money(Math.round(amountMajor * 100), currency);
  }

  public static zero(currency: CurrencyCode = 'INR'): Money {
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
    const locale = this.currency === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(this.toMajorUnits());
  }
}


export const SUPPORTED_CURRENCIES: readonly CurrencyCode[] = ['INR', 'USD'];

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
