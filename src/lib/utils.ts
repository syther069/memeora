import { formatMinorUnits } from '@/modules/finance/domain/money';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format currency with exact tabular formatting
 */
export function formatCurrency(amountMinor: number, currency: string = 'USD'): string {
  return formatMinorUnits(amountMinor, currency);
}
