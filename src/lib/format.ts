import { formatMoney } from './formatMoney';
import type { CurrencyLocale } from './currencies';

export function formatCurrency(amount: number, currencyCode: string, locale: CurrencyLocale = 'ar') {
  return formatMoney(amount, currencyCode, locale);
}
