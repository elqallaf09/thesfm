import type { MarketAssetType } from '@/lib/market/marketService';

export type MarketCurrencySource =
  | 'provider'
  | 'derived_from_symbol'
  | 'derived_from_exchange'
  | 'derived_from_asset_type'
  | 'unknown';

export type MarketCurrencyResolution = {
  currency: string | null;
  source: MarketCurrencySource;
};

type MarketCurrencyInput = {
  providerCurrency?: unknown;
  symbol?: unknown;
  providerSymbol?: unknown;
  exchange?: unknown;
  country?: unknown;
  assetType?: MarketAssetType | string | null;
};

type FormatMarketPriceInput = {
  price: number | null | undefined;
  currency?: string | null;
  exchange?: string | null;
  symbol?: string | null;
  locale?: string | null;
  includeKuwaitDinarEquivalent?: boolean;
  unknownCurrencyLabel?: string;
};

const EXCHANGE_CURRENCY_MATCHERS: Array<{ currency: string; source: Exclude<MarketCurrencySource, 'provider' | 'unknown'>; test: (input: { symbols: string[]; exchange: string; country: string; assetType?: string }) => boolean }> = [
  { currency: 'KWD', source: 'derived_from_symbol', test: ({ symbols }) => symbols.some(symbol => symbol.endsWith('.KW')) },
  { currency: 'KWD', source: 'derived_from_exchange', test: ({ exchange, country }) => /boursa\s*kuwait|kuwait/i.test(`${exchange} ${country}`) },
  { currency: 'SAR', source: 'derived_from_symbol', test: ({ symbols }) => symbols.some(symbol => symbol.endsWith('.SR') || symbol.endsWith('.SA')) },
  { currency: 'SAR', source: 'derived_from_exchange', test: ({ exchange, country }) => /tadawul|saudi/i.test(`${exchange} ${country}`) },
  { currency: 'AED', source: 'derived_from_symbol', test: ({ symbols }) => symbols.some(symbol => symbol.endsWith('.DU') || symbol.endsWith('.AD')) },
  { currency: 'AED', source: 'derived_from_exchange', test: ({ exchange }) => /dubai financial market|abu dhabi securities|dfm|adx/i.test(exchange) },
  { currency: 'QAR', source: 'derived_from_symbol', test: ({ symbols }) => symbols.some(symbol => symbol.endsWith('.QA')) },
  { currency: 'BHD', source: 'derived_from_symbol', test: ({ symbols }) => symbols.some(symbol => symbol.endsWith('.BH')) },
  { currency: 'OMR', source: 'derived_from_symbol', test: ({ symbols }) => symbols.some(symbol => symbol.endsWith('.OM')) },
  { currency: 'GBp', source: 'derived_from_symbol', test: ({ symbols }) => symbols.some(symbol => symbol.endsWith('.L')) },
  { currency: 'EUR', source: 'derived_from_symbol', test: ({ symbols }) => symbols.some(symbol => ['.DE', '.PA', '.MI', '.AS', '.MC'].some(suffix => symbol.endsWith(suffix))) },
  { currency: 'JPY', source: 'derived_from_symbol', test: ({ symbols }) => symbols.some(symbol => symbol.endsWith('.T')) },
  { currency: 'CAD', source: 'derived_from_symbol', test: ({ symbols }) => symbols.some(symbol => symbol.endsWith('.TO')) },
  { currency: 'AUD', source: 'derived_from_symbol', test: ({ symbols }) => symbols.some(symbol => symbol.endsWith('.AX')) },
  { currency: 'USD', source: 'derived_from_exchange', test: ({ exchange, country }) => /nasdaq|nyse|amex|arca|cboe|iex|united states|\bus\b/i.test(`${exchange} ${country}`) },
];

const ARABIC_MARKET_SYMBOLS: Record<string, string> = {
  KWD: 'د.ك',
  SAR: 'ر.س',
  AED: 'د.إ',
  QAR: 'ر.ق',
  BHD: 'د.ب',
  OMR: 'ر.ع',
  USD: '$',
  EUR: '€',
  GBP: '£',
  GBX: 'بنس',
  GBp: 'بنس',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
};

const PREFIX_SYMBOLS = new Set(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']);
const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW']);
const THREE_DECIMAL_CURRENCIES = new Set(['KWD', 'BHD', 'OMR']);

export function normalizeMarketCurrencyCode(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const compact = raw.replace(/\s+/g, '').replace(/^["']|["']$/g, '');
  if (/^(GBp|GBX|pence)$/i.test(compact)) return 'GBp';
  if (/^[A-Za-z]{3}$/.test(compact)) return compact.toUpperCase();
  return null;
}

function cleanMarketText(value: unknown) {
  return String(value ?? '').trim();
}

function marketSymbols(symbol?: unknown, providerSymbol?: unknown) {
  return [symbol, providerSymbol]
    .map(value => cleanMarketText(value).toUpperCase())
    .filter(Boolean);
}

function quoteCurrencyFromPair(symbols: string[]) {
  for (const symbol of symbols) {
    const compact = symbol.replace(/=X$/, '').replace(/[^A-Z]/g, '');
    if (compact.length === 6) return compact.slice(3);
    const cryptoQuote = symbol.match(/[-/]([A-Z]{3})$/);
    if (cryptoQuote?.[1]) return cryptoQuote[1];
  }
  return null;
}

function isLikelyUsSymbol(symbols: string[], exchange: string, country: string) {
  if (/nasdaq|nyse|amex|arca|cboe|iex|united states|\bus\b/i.test(`${exchange} ${country}`)) return true;
  return symbols.some(symbol => /^[A-Z]{1,5}$/.test(symbol) || /^[A-Z]{1,5}-[A-Z]$/.test(symbol));
}

export function resolveMarketCurrency(input: MarketCurrencyInput): MarketCurrencyResolution {
  const providerCurrency = normalizeMarketCurrencyCode(input.providerCurrency);
  if (providerCurrency) return { currency: providerCurrency, source: 'provider' };

  const symbols = marketSymbols(input.symbol, input.providerSymbol);
  const exchange = cleanMarketText(input.exchange);
  const country = cleanMarketText(input.country);
  const assetType = cleanMarketText(input.assetType).toLowerCase();

  if (assetType === 'forex') {
    const quote = quoteCurrencyFromPair(symbols);
    return quote ? { currency: quote, source: 'derived_from_symbol' } : { currency: null, source: 'unknown' };
  }

  if (assetType === 'crypto') {
    const quote = quoteCurrencyFromPair(symbols);
    return { currency: quote ?? 'USD', source: quote ? 'derived_from_symbol' : 'derived_from_asset_type' };
  }

  if (assetType === 'gold' || assetType === 'commodity') {
    return { currency: 'USD', source: 'derived_from_asset_type' };
  }

  for (const matcher of EXCHANGE_CURRENCY_MATCHERS) {
    if (matcher.test({ symbols, exchange, country, assetType })) {
      return { currency: matcher.currency, source: matcher.source };
    }
  }

  if ((assetType === 'stock' || assetType === 'etf' || assetType === 'index') && isLikelyUsSymbol(symbols, exchange, country)) {
    return { currency: 'USD', source: exchange || country ? 'derived_from_exchange' : 'derived_from_symbol' };
  }

  return { currency: null, source: 'unknown' };
}

export function marketCurrencyLabel(currency: string | null | undefined, locale?: string | null) {
  const normalized = normalizeMarketCurrencyCode(currency);
  if (!normalized) return locale === 'ar' ? 'العملة غير متاحة' : 'Currency unavailable';
  if ((locale ?? 'ar') === 'ar') return ARABIC_MARKET_SYMBOLS[normalized] ?? normalized;
  if (normalized === 'GBp') return 'GBp';
  return normalized;
}

function marketLocale(locale?: string | null) {
  if (locale === 'fr') return 'fr-FR';
  if (locale === 'ar') return 'ar-KW';
  return 'en-US';
}

function marketNumberLocale(locale?: string | null) {
  if (locale === 'fr') return 'fr-FR';
  return 'en-US';
}

function marketDecimals(price: number, currency: string | null) {
  if (!currency) return Math.abs(price) >= 1000 ? 2 : 4;
  if (currency === 'GBp') return 2;
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) return 0;
  if (THREE_DECIMAL_CURRENCIES.has(currency)) return 3;
  return Math.abs(price) >= 1000 ? 2 : 2;
}

function formatPlainNumber(value: number, locale?: string | null, digits = 2) {
  return new Intl.NumberFormat(marketNumberLocale(locale), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function isKuwaitMarket(symbol?: string | null, exchange?: string | null) {
  return /\.KW$/i.test(String(symbol ?? '')) || /boursa\s*kuwait|kuwait/i.test(String(exchange ?? ''));
}

export function formatMarketPrice({
  price,
  currency,
  exchange,
  symbol,
  locale = 'ar',
  includeKuwaitDinarEquivalent = false,
  unknownCurrencyLabel,
}: FormatMarketPriceInput) {
  const numeric = Number(price);
  if (!Number.isFinite(numeric)) return locale === 'ar' ? 'غير متاح' : 'Unavailable';
  const normalizedCurrency = normalizeMarketCurrencyCode(currency);
  const unknownLabel = unknownCurrencyLabel ?? (locale === 'ar' ? 'العملة غير متاحة' : 'currency unavailable');

  if (normalizedCurrency === 'KWD' && isKuwaitMarket(symbol, exchange)) {
    // Boursa Kuwait feeds differ: some return shares in fils (e.g. 776.00), while others return KWD (0.776).
    // Treat values >= 10 as fils so Kuwaiti stocks never appear as oversized KWD or USD prices.
    if (Math.abs(numeric) >= 10) {
      const fils = `${formatPlainNumber(numeric, locale, 2)} ${locale === 'ar' ? 'فلس' : 'fils'}`;
      if (!includeKuwaitDinarEquivalent) return fils;
      return `${fils} (${formatPlainNumber(numeric / 1000, locale, 3)} ${marketCurrencyLabel('KWD', locale)})`;
    }
    return `${formatPlainNumber(numeric, locale, 3)} ${marketCurrencyLabel('KWD', locale)}`;
  }

  if (!normalizedCurrency) {
    return `${formatPlainNumber(numeric, locale, Math.abs(numeric) >= 1000 ? 2 : 4)} ${unknownLabel}`;
  }

  if (normalizedCurrency === 'GBp') {
    return `${formatPlainNumber(numeric, locale, 2)} ${marketCurrencyLabel('GBp', locale)}`;
  }

  const digits = marketDecimals(numeric, normalizedCurrency);
  const sign = numeric < 0 ? '-' : '';
  const formattedNumber = formatPlainNumber(Math.abs(numeric), locale, digits);
  const label = marketCurrencyLabel(normalizedCurrency, locale);

  if (locale === 'ar') {
    return PREFIX_SYMBOLS.has(normalizedCurrency) ? `${sign}${label}${formattedNumber}` : `${sign}${formattedNumber} ${label}`;
  }

  try {
    return new Intl.NumberFormat(marketLocale(locale), {
      style: 'currency',
      currency: normalizedCurrency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(numeric);
  } catch {
    return PREFIX_SYMBOLS.has(normalizedCurrency) ? `${sign}${label}${formattedNumber}` : `${sign}${formattedNumber} ${label}`;
  }
}
