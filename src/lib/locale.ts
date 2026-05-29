import { getCurrency } from './currencies';
import type { CurrencyLocale } from './currencies';

export type AppLocale = CurrencyLocale;
export type AppDirection = 'rtl' | 'ltr';

export type LocaleConfig = {
  locale: AppLocale;
  intlLocale: string;
  direction: AppDirection;
  currencyPosition: 'before' | 'after';
};

const LOCALE_CONFIG: Record<AppLocale, LocaleConfig> = {
  ar: {
    locale: 'ar',
    intlLocale: 'ar-KW',
    direction: 'rtl',
    currencyPosition: 'after',
  },
  en: {
    locale: 'en',
    intlLocale: 'en-US',
    direction: 'ltr',
    currencyPosition: 'before',
  },
  fr: {
    locale: 'fr',
    intlLocale: 'fr-FR',
    direction: 'ltr',
    currencyPosition: 'after',
  },
};

export function normalizeLocale(locale?: string | null): AppLocale {
  return locale === 'en' || locale === 'fr' || locale === 'ar' ? locale : 'ar';
}

export function getLocaleConfig(locale?: string | null): LocaleConfig {
  return LOCALE_CONFIG[normalizeLocale(locale)];
}

export function getDirectionByLocale(locale?: string | null): AppDirection {
  return getLocaleConfig(locale).direction;
}

export function formatNumber(value: number, locale?: string | null, options?: Intl.NumberFormatOptions) {
  const config = getLocaleConfig(locale);
  return new Intl.NumberFormat(config.intlLocale, options).format(value);
}

export function parseAppDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(date.getTime()) ? date : null;
}

export function formatDate(value: unknown, locale?: string | null, options?: Intl.DateTimeFormatOptions) {
  const date = parseAppDate(value);
  if (!date) return '';
  const config = getLocaleConfig(locale);
  return new Intl.DateTimeFormat(config.intlLocale, options ?? {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatCurrency(amount: number, currencyCode = 'KWD', locale?: string | null) {
  const config = getLocaleConfig(locale);
  const currency = getCurrency(currencyCode);
  try {
    return new Intl.NumberFormat(config.intlLocale, {
      style: 'currency',
      currency: currency.code,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals,
    }).format(amount);
  } catch {
    const formatted = formatNumber(amount, config.locale, {
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals,
    });
    return config.currencyPosition === 'before' ? `${currency.code} ${formatted}` : `${formatted} ${currency.code}`;
  }
}

export function formatPercent(value: number, locale?: string | null, options?: Intl.NumberFormatOptions) {
  return formatNumber(value, locale, {
    style: 'percent',
    maximumFractionDigits: 0,
    ...options,
  });
}
