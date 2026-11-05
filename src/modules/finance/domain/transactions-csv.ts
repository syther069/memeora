export interface CsvRow {
  occurred_at: Date | string;
  type: string;
  amount_minor: string | number;
  currency: string;
  category: string;
  description: string;
  counterparty: string | null;
  reference: string | null;
  chain: string | null;
  tx_hash: string | null;
  asset_symbol: string | null;
  asset_amount: string | null;
  verification: string | null;
  fiat_estimated: boolean;
}

const HEADER = ['Date', 'Type', 'Amount', 'Currency', 'Category', 'Note', 'Client or vendor', 'Reference', 'Chain', 'Transaction hash', 'Token', 'Token amount', 'Verified on chain', 'Value is an estimate'];

/** Exact decimal text from integer minor units, without going through floats. */
function minorToDecimal(value: string | number): string {
  const digits = BigInt(value).toString().padStart(3, '0');
  return `${digits.slice(0, -2)}.${digits.slice(-2)}`;
}

/**
 * Quotes a cell. A note a user typed must not run as a formula when the file is
 * opened in a spreadsheet, so text starting like one gets a leading apostrophe.
 */
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toTransactionsCsv(rows: CsvRow[]): string {
  const lines = rows.map((row) => [
    new Date(row.occurred_at).toISOString().slice(0, 10),
    row.type,
    minorToDecimal(row.amount_minor),
    row.currency,
    row.category,
    row.description,
    row.counterparty ?? '',
    row.reference ?? '',
    row.chain ?? '',
    row.tx_hash ?? '',
    row.asset_symbol ?? '',
    row.asset_amount ?? '',
    row.tx_hash ? (row.verification === 'sui_verified' ? 'yes' : 'no') : '',
    row.fiat_estimated ? 'yes' : '',
  ].map(cell).join(','));
  return `${[HEADER.join(','), ...lines].join('\r\n')}\r\n`;
}
