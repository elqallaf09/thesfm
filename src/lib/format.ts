import { getCurrency } from './currencies';

const PREFIX_SYMBOLS = new Set(['$', '€', '£', '¥', '₹', '₺', '₨', 'C$', 'A$']);

export function formatCurrency(
  amount: number,
  currencyCode: string,
  locale: 'ar' | 'en' | 'fr' = 'ar',
): string {
  const currency = getCurrency(currencyCode);
  const symbol = locale === 'ar' ? currency.symbolAr : currency.symbolEn;

  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  });

  if (locale === 'ar') return `${formatted} ${symbol}`;
  if (PREFIX_SYMBOLS.has(symbol)) return `${symbol}${formatted}`;
  return `${formatted} ${symbol}`;
}
