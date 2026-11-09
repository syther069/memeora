import { CurrencyCode, isCurrencyCode, MAX_AMOUNT_MINOR } from '../domain/money';
import { TransactionType } from '../domain/transaction';

export interface TransactionInput {
  type: TransactionType;
  amountMinor: number;
  currency: CurrencyCode;
  category: string;
  description: string;
  occurredAt: Date;
  counterparty: string | null;
  reference: string | null;
}

/** Optional short business field: trimmed, empty means none, null value if too long. */
function shortField(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.trim().length > 100) return undefined;
  return value.trim() || null;
}

/** Validates a transaction request body. Used by both create and edit. */
export function parseTransactionInput(input: Record<string, unknown>):
  | { ok: true; value: TransactionInput }
  | { ok: false; message: string } {
  const { type, amountMinor, currency = 'USD', category, description = '', occurredAt } = input;
  if (type !== 'income' && type !== 'expense') return { ok: false, message: 'Type must be income or expense.' };
  if (typeof amountMinor !== 'number' || !Number.isSafeInteger(amountMinor) || amountMinor <= 0 || amountMinor > MAX_AMOUNT_MINOR) {
    return { ok: false, message: 'amountMinor must be a positive whole number of minor units, at most 10 billion.' };
  }
  if (!isCurrencyCode(currency)) return { ok: false, message: 'Choose a supported currency.' };
  if (typeof category !== 'string' || !category.trim() || category.trim().length > 50) {
    return { ok: false, message: 'Category must be between 1 and 50 characters.' };
  }
  if (typeof description !== 'string' || description.length > 500) {
    return { ok: false, message: 'Description must be a string of at most 500 characters.' };
  }
  if (occurredAt !== undefined && (typeof occurredAt !== 'string' || !Number.isFinite(Date.parse(occurredAt)))) {
    return { ok: false, message: 'occurredAt must be a valid date string.' };
  }
  const counterparty = shortField(input.counterparty);
  const reference = shortField(input.reference);
  if (counterparty === undefined || reference === undefined) {
    return { ok: false, message: 'Client, vendor and reference can be at most 100 characters.' };
  }
  return {
    ok: true,
    value: {
      type,
      amountMinor,
      currency,
      category: category.trim(),
      description: description.trim(),
      occurredAt: occurredAt === undefined ? new Date() : new Date(occurredAt as string),
      counterparty,
      reference,
    },
  };
}
