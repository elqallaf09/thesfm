import { currencyDisplaySymbol, getCurrency, type CurrencyLocale } from './currencies';
import { formatNumber, normalizeDigits } from './locale';
import { parseMoneyValue } from './money';

const RTL_CONTROL_CHARS = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
const ARABIC_KWD_LABEL = '\u062f.\u0643';

const DISPLAY_TEXT: Record<CurrencyLocale, { unavailable: string; helper: string }> = {
  ar: {
    unavailable: '\u063a\u064a\u0631 \u0645\u062a\u0627\u062d',
    helper: '\u0633\u064a\u0638\u0647\u0631 \u0647\u0630\u0627 \u0627\u0644\u0631\u0642\u0645 \u0628\u0639\u062f \u0625\u062f\u062e\u0627\u0644 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a.',
  },
  en: {
    unavailable: 'Unavailable',
    helper: 'This figure will appear after data is entered.',
  },
  fr: {
    unavailable: 'Non disponible',
    helper: 'Ce chiffre apparaitra apres la saisie des donnees.',
  },
};

function normalizeLocale(locale?: string | null): CurrencyLocale {
  return locale === 'en' || locale === 'fr' || locale === 'ar' ? locale : 'ar';
}

function cleanCurrencyLabel(value: string) {
  return normalizeDigits(value)
    .replace(RTL_CONTROL_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function financialUnavailableLabel(locale?: string | null) {
  return DISPLAY_TEXT[normalizeLocale(locale)].unavailable;
}

export function financialUnavailableHelper(locale?: string | null) {
  return DISPLAY_TEXT[normalizeLocale(locale)].helper;
}

export function financialCurrencyLabel(currencyCode = 'KWD', locale?: string | null) {
  const lang = normalizeLocale(locale);
  const currency = getCurrency(currencyCode || 'KWD');
  if (lang === 'ar' && currency.code === 'KWD') return ARABIC_KWD_LABEL;

  const cleaned = cleanCurrencyLabel(currencyDisplaySymbol(currency, lang));
  return cleaned || currency.code;
}

export function formatFinancialNumber(
  value: unknown,
  locale?: string | null,
  options?: Intl.NumberFormatOptions,
) {
  const parsed = parseMoneyValue(value);
  if (parsed.status !== 'valid') return financialUnavailableLabel(locale);
  const amount = Object.is(parsed.value, -0) ? 0 : parsed.value;
  return formatNumber(amount, locale, options);
}

export function formatFinancialCurrency(value: unknown, currencyCode = 'KWD', locale?: string | null) {
  const parsed = parseMoneyValue(value);
  if (parsed.status !== 'valid') return financialUnavailableLabel(locale);

  const currency = getCurrency(currencyCode || 'KWD');
  const amount = Object.is(parsed.value, -0) ? 0 : parsed.value;
  const number = formatNumber(amount, locale, {
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  });

  return `${number} ${financialCurrencyLabel(currency.code, locale)}`;
}
