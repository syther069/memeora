/**
 * Calendar helpers for ledger dates. A transaction belongs to the calendar date
 * the user picked, so it is stored at 12:00 UTC of that date and always read
 * back in UTC. Storing local midnight would move a 1 November entry made in
 * India to 31 October, and into the wrong month's totals.
 */

const pad = (value: number) => String(value).padStart(2, '0');

/** Today in the user's own time zone, as YYYY-MM-DD. */
export function localDateInput(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** This month in the user's own time zone, as YYYY-MM. */
export function localPeriod(date = new Date()): string {
  return localDateInput(date).slice(0, 7);
}

export function dateInputToOccurredAt(dateInput: string): string {
  return `${dateInput}T12:00:00.000Z`;
}

export function occurredAtToDateInput(occurredAt: string): string {
  return occurredAt.slice(0, 10);
}

export function formatLedgerDate(occurredAt: string): string {
  return new Date(occurredAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function formatPeriod(period: string): string {
  return new Date(`${period}-01T00:00:00Z`).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
