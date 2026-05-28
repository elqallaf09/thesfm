import type { CurrencyLocale } from './currencies';
import { formatCurrency } from './locale';

export function formatMoney(amount: number, currencyCode = 'KWD', language: CurrencyLocale = 'ar') {
  return formatCurrency(amount, currencyCode, language);
}
