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

const ARABIC_INDIC_DIGITS = '\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669';
const EASTERN_ARABIC_DIGITS = '\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9';

const LOCALE_CONFIG: Record<AppLocale, LocaleConfig> = {
  ar: {
    locale: 'ar',
    intlLocale: 'ar-KW-u-nu-latn',
    direction: 'rtl',
    currencyPosition: 'after',
  },
  en: {
    locale: 'en',
    intlLocale: 'en-US-u-nu-latn',
    direction: 'ltr',
    currencyPosition: 'before',
  },
  fr: {
    locale: 'fr',
    intlLocale: 'fr-FR-u-nu-latn',
    direction: 'ltr',
    currencyPosition: 'after',
  },
};

function latinDigitValue(digit: string) {
  const arabicIndex = ARABIC_INDIC_DIGITS.indexOf(digit);
  if (arabicIndex >= 0) return String(arabicIndex);
  const easternArabicIndex = EASTERN_ARABIC_DIGITS.indexOf(digit);
  if (easternArabicIndex >= 0) return String(easternArabicIndex);
  return digit;
}

export function normalizeDigits(value: unknown): string {
  return String(value ?? '')
    .replace(/[\u0660-\u0669\u06F0-\u06F9]/g, latinDigitValue)
    .replace(/\u066B/g, '.')
    .replace(/\u066C/g, ',')
    .replace(/\u066A/g, '%')
    .replace(/[\u061C\u200E\u200F]/g, '');
}

export function toLatinNumberLocale(locale?: string | null) {
  const raw = String(locale ?? '').trim();
  if (!raw) return 'en-US-u-nu-latn';
  if (/-u(?:-.+)?-nu-/i.test(raw)) return raw.replace(/-nu-[a-z0-9]+/i, '-nu-latn');
  if (/-u-/i.test(raw)) return `${raw}-nu-latn`;
  return `${raw}-u-nu-latn`;
}

function withLatinNumbering<T extends Intl.NumberFormatOptions | Intl.DateTimeFormatOptions>(options?: T) {
  return { ...(options ?? {}), numberingSystem: 'latn' } as T & { numberingSystem: 'latn' };
}

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
  return normalizeDigits(new Intl.NumberFormat(config.intlLocale, withLatinNumbering(options)).format(value));
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
  return normalizeDigits(new Intl.DateTimeFormat(config.intlLocale, withLatinNumbering(options ?? {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })).format(date));
}

export function formatTime(value: unknown, locale?: string | null, options?: Intl.DateTimeFormatOptions) {
  const date = parseAppDate(value);
  if (!date) return '';
  const config = getLocaleConfig(locale);
  return normalizeDigits(new Intl.DateTimeFormat(config.intlLocale, withLatinNumbering(options ?? {
    hour: '2-digit',
    minute: '2-digit',
  })).format(date));
}

export function formatCurrency(amount: number, currencyCode = 'KWD', locale?: string | null) {
  const config = getLocaleConfig(locale);
  const currency = getCurrency(currencyCode);
  try {
    return normalizeDigits(new Intl.NumberFormat(config.intlLocale, withLatinNumbering({
      style: 'currency',
      currency: currency.code,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals,
    })).format(amount));
  } catch {
    const formatted = formatNumber(amount, config.locale, {
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals,
    });
    return normalizeDigits(config.currencyPosition === 'before' ? `${currency.code} ${formatted}` : `${formatted} ${currency.code}`);
  }
}

export function formatPercent(value: number, locale?: string | null, options?: Intl.NumberFormatOptions) {
  return formatNumber(value, locale, {
    style: 'percent',
    maximumFractionDigits: 0,
    ...options,
  });
}
