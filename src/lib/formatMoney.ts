import { currencyDisplaySymbol, getCurrency } from './currencies';
import type { CurrencyLocale } from './currencies';

export function formatMoney(amount: number, currencyCode = 'KWD', language: CurrencyLocale = 'ar') {
  const currency = getCurrency(currencyCode);
  const locale = language === 'ar' ? 'ar-KW' : language === 'fr' ? 'fr-FR' : 'en-US';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.code,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals,
    }).format(amount);
  } catch {
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals,
    }).format(amount);
    const symbol = currencyDisplaySymbol(currency, language);
    return language === 'ar' ? `${formatted} ${symbol}` : `${symbol}${formatted}`;
  }
}
