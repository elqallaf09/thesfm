import type { MarketAssetType } from '@/lib/market/marketService';

export type MarketCurrencySource =
  | 'provider'
  | 'derived_from_symbol'
  | 'derived_from_exchange'
  | 'derived_from_asset_type'
  | 'unknown';

export type MarketPriceUnit = 'major' | 'fils' | 'pence' | null;

export type MarketCurrencyResolution = {
  currency: string | null;
  source: MarketCurrencySource;
};

export type MarketCurrencyInput = {
  providerCurrency?: unknown;
  symbol?: unknown;
  providerSymbol?: unknown;
  exchange?: unknown;
  market?: unknown;
  country?: unknown;
  assetType?: MarketAssetType | string | null;
};

export type NormalizedMarketPrice = {
  rawPrice: number | null;
  price: number | null;
  currency: string | null;
  priceUnit: MarketPriceUnit;
  currencySource?: MarketCurrencySource;
};

type FormatMarketPriceInput = {
  price: number | null | undefined;
  currency?: string | null;
  exchange?: string | null;
  market?: string | null;
  symbol?: string | null;
  providerSymbol?: string | null;
  assetType?: MarketAssetType | string | null;
  priceUnit?: MarketPriceUnit;
  locale?: string | null;
  includeKuwaitDinarEquivalent?: boolean;
  unknownCurrencyLabel?: string;
};

const EXCHANGE_CURRENCY_MATCHERS: Array<{
  currency: string;
  source: Exclude<MarketCurrencySource, 'provider' | 'unknown'>;
  test: (input: { symbols: string[]; exchange: string; market: string; country: string; assetType?: string }) => boolean;
}> = [
  { currency: 'KWD', source: 'derived_from_symbol', test: ({ symbols }) => symbols.some(symbol => symbol.endsWith('.KW')) },
  { currency: 'KWD', source: 'derived_from_exchange', test: ({ exchange, market, country }) => /boursa\s*kuwait|kuwait|kse|بورصة\s*الكويت|الكويت/i.test(`${exchange} ${market} ${country}`) },
  { currency: 'SAR', source: 'derived_from_symbol', test: ({ symbols }) => symbols.some(symbol => symbol.endsWith('.SR') || symbol.endsWith('.SA')) },
  { currency: 'SAR', source: 'derived_from_exchange', test: ({ exchange, market, country }) => /tadawul|saudi|riyadh|تداول|السعودية|السوق\s*السعودية/i.test(`${exchange} ${market} ${country}`) },
  { currency: 'AED', source: 'derived_from_symbol', test: ({ symbols }) => symbols.some(symbol => symbol.endsWith('.AE') || symbol.endsWith('.DU') || symbol.endsWith('.AD')) },
  { currency: 'AED', source: 'derived_from_exchange', test: ({ exchange, market, country }) => /dubai financial market|abu dhabi securities|dfm|adx|uae|emirates|دبي|أبو\s*ظبي|ابو\s*ظبي|الإمارات|الامارات/i.test(`${exchange} ${market} ${country}`) },
  { currency: 'QAR', source: 'derived_from_symbol', test: ({ symbols }) => symbols.some(symbol => symbol.endsWith('.QA')) },
  { currency: 'QAR', source: 'derived_from_exchange', test: ({ exchange, market, country }) => /qatar|doha|qe\b|قطر|الدوحة/i.test(`${exchange} ${market} ${country}`) },
  { currency: 'BHD', source: 'derived_from_symbol', test: ({ symbols }) => symbols.some(symbol => symbol.endsWith('.BH')) },
  { currency: 'BHD', source: 'derived_from_exchange', test: ({ exchange, market, country }) => /bahrain|البحرين/i.test(`${exchange} ${market} ${country}`) },
  { currency: 'OMR', source: 'derived_from_symbol', test: ({ symbols }) => symbols.some(symbol => symbol.endsWith('.OM')) },
  { currency: 'OMR', source: 'derived_from_exchange', test: ({ exchange, market, country }) => /oman|muscat|msx|عمان|مسقط/i.test(`${exchange} ${market} ${country}`) },
  { currency: 'GBP', source: 'derived_from_symbol', test: ({ symbols }) => symbols.some(symbol => symbol.endsWith('.L')) },
  { currency: 'GBP', source: 'derived_from_exchange', test: ({ exchange, market, country }) => /london|lse|united kingdom|great britain|\buk\b/i.test(`${exchange} ${market} ${country}`) },
  { currency: 'EUR', source: 'derived_from_symbol', test: ({ symbols }) => symbols.some(symbol => ['.DE', '.PA', '.MI', '.AS', '.MC'].some(suffix => symbol.endsWith(suffix))) },
  { currency: 'EUR', source: 'derived_from_exchange', test: ({ exchange, market, country }) => /xetra|frankfurt|paris|euronext|milan|bme|madrid|amsterdam|euro/i.test(`${exchange} ${market} ${country}`) },
  { currency: 'JPY', source: 'derived_from_symbol', test: ({ symbols }) => symbols.some(symbol => symbol.endsWith('.T')) },
  { currency: 'JPY', source: 'derived_from_exchange', test: ({ exchange, market, country }) => /tokyo|japan|tse/i.test(`${exchange} ${market} ${country}`) },
  { currency: 'CAD', source: 'derived_from_symbol', test: ({ symbols }) => symbols.some(symbol => symbol.endsWith('.TO')) },
  { currency: 'CAD', source: 'derived_from_exchange', test: ({ exchange, market, country }) => /toronto|tsx|canada/i.test(`${exchange} ${market} ${country}`) },
  { currency: 'HKD', source: 'derived_from_symbol', test: ({ symbols }) => symbols.some(symbol => symbol.endsWith('.HK')) },
  { currency: 'HKD', source: 'derived_from_exchange', test: ({ exchange, market, country }) => /hong kong|hkex/i.test(`${exchange} ${market} ${country}`) },
  { currency: 'AUD', source: 'derived_from_symbol', test: ({ symbols }) => symbols.some(symbol => symbol.endsWith('.AX')) },
  { currency: 'AUD', source: 'derived_from_exchange', test: ({ exchange, market, country }) => /australia|asx/i.test(`${exchange} ${market} ${country}`) },
  { currency: 'USD', source: 'derived_from_exchange', test: ({ exchange, market, country }) => /nasdaq|nyse|amex|arca|cboe|iex|united states|\bus\b/i.test(`${exchange} ${market} ${country}`) },
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
  JPY: '¥',
  CAD: 'C$',
  HKD: 'HK$',
  AUD: 'A$',
  CHF: 'CHF',
};

const PREFIX_SYMBOLS = new Set(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'HKD', 'AUD']);
const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW']);
const THREE_DECIMAL_CURRENCIES = new Set(['KWD', 'BHD', 'OMR']);

export function normalizeMarketCurrencyCode(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const compact = raw.replace(/\s+/g, '').replace(/^["']|["']$/g, '');
  if (/^(KWF|fils)$/i.test(compact)) return 'KWD';
  if (/^(GBp|GBX|pence|GBpence|GBpenny)$/i.test(compact)) return 'GBP';
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

function shouldPreferDerivedCurrency(providerCurrency: string, derivedCurrency: string, symbols: string[], exchange: string, market: string, country: string, assetType: string) {
  if (providerCurrency === derivedCurrency) return false;
  if (!['stock', 'etf', 'index', ''].includes(assetType)) return false;
  const identity = `${symbols.join(' ')} ${exchange} ${market} ${country}`;
  if (/\.KW\b|boursa\s*kuwait|kuwait|kse/i.test(identity)) return true;
  if (providerCurrency === 'USD' && derivedCurrency !== 'USD') return true;
  return false;
}

export function resolveMarketCurrency(input: MarketCurrencyInput): MarketCurrencyResolution {
  const providerCurrency = normalizeMarketCurrencyCode(input.providerCurrency);
  const symbols = marketSymbols(input.symbol, input.providerSymbol);
  const exchange = cleanMarketText(input.exchange);
  const market = cleanMarketText(input.market);
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

  let derived: MarketCurrencyResolution | null = null;
  for (const matcher of EXCHANGE_CURRENCY_MATCHERS) {
    if (matcher.test({ symbols, exchange, market, country, assetType })) {
      derived = { currency: matcher.currency, source: matcher.source };
      break;
    }
  }

  if (providerCurrency) {
    if (derived?.currency && shouldPreferDerivedCurrency(providerCurrency, derived.currency, symbols, exchange, market, country, assetType)) {
      return derived;
    }
    return { currency: providerCurrency, source: 'provider' };
  }

  if (derived) return derived;

  if ((assetType === 'stock' || assetType === 'etf' || assetType === 'index') && isLikelyUsSymbol(symbols, exchange, country)) {
    return { currency: 'USD', source: exchange || country ? 'derived_from_exchange' : 'derived_from_symbol' };
  }

  return { currency: null, source: 'unknown' };
}

export function resolveAssetCurrency(input: MarketCurrencyInput): MarketCurrencyResolution {
  return resolveMarketCurrency(input);
}

export function marketCurrencyLabel(currency: string | null | undefined, locale?: string | null) {
  const normalized = normalizeMarketCurrencyCode(currency);
  if (!normalized) return locale === 'ar' ? 'العملة غير متاحة' : locale === 'fr' ? 'Devise indisponible' : 'Currency unavailable';
  if ((locale ?? 'ar') === 'ar') return ARABIC_MARKET_SYMBOLS[normalized] ?? normalized;
  return normalized;
}

export function getCurrencySymbol(currency: string | null | undefined, locale?: string | null) {
  return marketCurrencyLabel(currency, locale);
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
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) return 0;
  if (THREE_DECIMAL_CURRENCIES.has(currency)) return 3;
  return 2;
}

function formatPlainNumber(value: number, locale?: string | null, digits = 2) {
  return new Intl.NumberFormat(marketNumberLocale(locale), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function isKuwaitMarket(symbol?: string | null, exchange?: string | null, market?: string | null) {
  return /\.KW\b/i.test(String(symbol ?? '')) || /boursa\s*kuwait|kuwait|kse|بورصة\s*الكويت|الكويت/i.test(`${exchange ?? ''} ${market ?? ''}`);
}

function isLondonMarket(symbol?: string | null, exchange?: string | null, market?: string | null) {
  return /\.L\b/i.test(String(symbol ?? '')) || /london|lse|united kingdom/i.test(`${exchange ?? ''} ${market ?? ''}`);
}

function marketPriceUnitLabel(unit: Exclude<MarketPriceUnit, 'major' | null>, locale?: string | null) {
  if (unit === 'fils') return locale === 'ar' ? 'فلس' : 'fils';
  return locale === 'ar' ? 'بنس' : locale === 'fr' ? 'pence' : 'pence';
}

export function detectPriceUnit(input: {
  price?: number | null;
  currency?: string | null;
  providerCurrency?: unknown;
  symbol?: string | null;
  providerSymbol?: string | null;
  exchange?: string | null;
  market?: string | null;
  assetType?: MarketAssetType | string | null;
}): MarketPriceUnit {
  const numeric = Number(input.price);
  if (!Number.isFinite(numeric)) return null;
  const symbols = marketSymbols(input.symbol, input.providerSymbol).join(' ');
  const exchange = [input.exchange, input.market].map(cleanMarketText).join(' ');
  const providerCurrency = String(input.providerCurrency ?? '').trim();
  const currency = normalizeMarketCurrencyCode(input.currency ?? input.providerCurrency);

  if ((currency === 'KWD' || /^KWF$/i.test(providerCurrency) || isKuwaitMarket(symbols, exchange)) && Math.abs(numeric) >= 10) {
    return 'fils';
  }

  if ((currency === 'GBP' || /^(GBp|GBX|pence)$/i.test(providerCurrency) || isLondonMarket(symbols, exchange)) && Math.abs(numeric) > 20) {
    return 'pence';
  }

  return 'major';
}

export function normalizeMarketPrice(input: {
  price: number | null | undefined;
  currency?: string | null;
  providerCurrency?: unknown;
  symbol?: string | null;
  providerSymbol?: string | null;
  exchange?: string | null;
  market?: string | null;
  assetType?: MarketAssetType | string | null;
  priceUnit?: MarketPriceUnit;
  currencySource?: MarketCurrencySource;
}): NormalizedMarketPrice {
  const rawPrice = Number(input.price);
  const currency = normalizeMarketCurrencyCode(input.currency ?? input.providerCurrency);
  if (!Number.isFinite(rawPrice)) {
    return {
      rawPrice: null,
      price: null,
      currency,
      priceUnit: input.priceUnit ?? null,
      currencySource: input.currencySource,
    };
  }

  const priceUnit = input.priceUnit ?? detectPriceUnit({
    price: rawPrice,
    currency,
    providerCurrency: input.providerCurrency,
    symbol: input.symbol,
    providerSymbol: input.providerSymbol,
    exchange: input.exchange,
    market: input.market,
    assetType: input.assetType,
  });

  const price = priceUnit === 'fils'
    ? rawPrice / 1000
    : priceUnit === 'pence'
      ? rawPrice / 100
      : rawPrice;

  return {
    rawPrice,
    price,
    currency,
    priceUnit,
    currencySource: input.currencySource,
  };
}

export function formatMarketPrice({
  price,
  currency,
  exchange,
  market,
  symbol,
  providerSymbol,
  assetType,
  priceUnit,
  locale = 'ar',
  includeKuwaitDinarEquivalent = false,
  unknownCurrencyLabel,
}: FormatMarketPriceInput) {
  const resolvedCurrency = resolveMarketCurrency({
    providerCurrency: currency,
    symbol,
    providerSymbol,
    exchange,
    market,
    assetType,
  });
  const normalizedPrice = normalizeMarketPrice({
    price,
    currency: resolvedCurrency.currency,
    symbol,
    providerSymbol,
    exchange,
    market,
    assetType,
    priceUnit,
  });
  if (normalizedPrice.price === null) return locale === 'ar' ? 'غير متاح' : locale === 'fr' ? 'Indisponible' : 'Unavailable';
  const numeric = normalizedPrice.price;
  const normalizedCurrency = normalizedPrice.currency;
  const unknownLabel = unknownCurrencyLabel ?? (locale === 'ar' ? 'العملة غير متاحة' : locale === 'fr' ? 'devise indisponible' : 'currency unavailable');

  if (normalizedCurrency === 'KWD' && isKuwaitMarket(symbol ?? providerSymbol, exchange, market)) {
    const primary = `${formatPlainNumber(numeric, locale, 3)} ${marketCurrencyLabel('KWD', locale)}`;
    if (includeKuwaitDinarEquivalent) {
      const rawFils = normalizedPrice.priceUnit === 'fils' && normalizedPrice.rawPrice !== null
        ? normalizedPrice.rawPrice
        : numeric > 0 && Math.abs(numeric) < 10
          ? numeric * 1000
          : null;
      if (rawFils !== null) {
        const secondary = `${formatPlainNumber(rawFils, locale, 0)} ${marketPriceUnitLabel('fils', locale)}`;
        return `${primary} · ${secondary}`;
      }
    }
    return primary;
  }

  if (!normalizedCurrency) {
    return `${formatPlainNumber(numeric, locale, Math.abs(numeric) >= 1000 ? 2 : 4)} ${unknownLabel}`;
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
