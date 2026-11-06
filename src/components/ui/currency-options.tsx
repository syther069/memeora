import { CURRENCY_LABELS, SUPPORTED_CURRENCIES } from '@/modules/finance/domain/money';

/** The options of every currency select, so they can't drift apart. */
export function CurrencyOptions() {
  return <>{SUPPORTED_CURRENCIES.map((code) => <option key={code} value={code}>{CURRENCY_LABELS[code]}</option>)}</>;
}
