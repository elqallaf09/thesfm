import { normalizeMarketSymbol } from '@/lib/market/normalizeSymbol';
import type { MarketAssetType } from '@/lib/market/marketService';

type QuoteDirection = 'asc' | 'desc';

export type NormalizedQuoteSymbol = {
  inputSymbol: string;
  requestedSymbol: string;
  canonicalSymbol: string;
  displaySymbol: string;
  providerSymbol: string | null;
  assetType: MarketAssetType | null;
  alternatives: string[];
};

export type RawQuoteForNormalization = {
  symbol?: unknown;
  requestedSymbol?: unknown;
  canonicalSymbol?: unknown;
  displaySymbol?: unknown;
  providerSymbol?: unknown;
  providerSymbolUsed?: unknown;
  symbolUsed?: unknown;
  provider?: unknown;
  source?: unknown;
  assetType?: unknown;
  assetClass?: unknown;
  type?: unknown;
  price?: unknown;
  currentPrice?: unknown;
  latestPrice?: unknown;
  lastPrice?: unknown;
  regularMarketPrice?: unknown;
  close?: unknown;
  previousClose?: unknown;
  prevClose?: unknown;
  priorClose?: unknown;
  regularMarketPreviousClose?: unknown;
  change?: unknown;
  priceChange?: unknown;
  regularMarketChange?: unknown;
  changePercent?: unknown;
  percentChange?: unknown;
  regularMarketChangePercent?: unknown;
  available?: unknown;
  unavailableReason?: unknown;
};

export type NormalizedQuote = NormalizedQuoteSymbol & {
  providerSymbolUsed: string | null;
  price: number | null;
  currentPrice: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  available: boolean;
  unavailableReason: string | null;
};

function textOrNull(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text || null;
}

export function finiteQuoteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstFiniteNumber(...values: unknown[]) {
  for (const value of values) {
    const parsed = finiteQuoteNumber(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function roundQuoteNumber(value: number | null) {
  return value === null ? null : Number(value.toFixed(6));
}

function normalizeAssetType(value: unknown): MarketAssetType | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'stocks') return 'stock';
  if (normalized === 'fund' || normalized === 'funds') return 'etf';
  if (normalized === 'commodities' || normalized === 'metal' || normalized === 'metals') return 'commodity';
  if (normalized === 'indices' || normalized === 'indexes') return 'index';
  if (['stock', 'etf', 'crypto', 'forex', 'commodity', 'gold', 'index'].includes(normalized)) {
    return normalized as MarketAssetType;
  }
  return null;
}

function compactSymbol(value: unknown) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[\\/:-]/g, '');
}

export function isValidPrice(value: unknown): value is number {
  const parsed = finiteQuoteNumber(value);
  return parsed !== null && parsed > 0;
}

export function isValidChange(value: unknown): value is number {
  const parsed = finiteQuoteNumber(value);
  return parsed !== null && parsed > -100 && Math.abs(parsed) < 100000;
}

export function normalizeSymbol(symbol: unknown, assetClass?: unknown): NormalizedQuoteSymbol {
  const inputSymbol = textOrNull(symbol) ?? '';
  const assetType = normalizeAssetType(assetClass);
  const normalized = normalizeMarketSymbol(inputSymbol, assetType ?? assetClass);
  if (normalized) {
    return {
      inputSymbol,
      requestedSymbol: inputSymbol,
      canonicalSymbol: normalized.displaySymbol,
      displaySymbol: normalized.displaySymbol,
      providerSymbol: normalized.providerSymbol,
      assetType: normalized.assetType,
      alternatives: normalized.alternatives,
    };
  }

  const compact = compactSymbol(inputSymbol);
  return {
    inputSymbol,
    requestedSymbol: inputSymbol,
    canonicalSymbol: compact,
    displaySymbol: compact,
    providerSymbol: compact || null,
    assetType,
    alternatives: compact ? [compact] : [],
  };
}

export function normalizeQuote(rawQuote: RawQuoteForNormalization): NormalizedQuote {
  const assetClass = rawQuote.assetClass ?? rawQuote.assetType ?? rawQuote.type;
  const symbol = normalizeSymbol(
    rawQuote.canonicalSymbol
      ?? rawQuote.displaySymbol
      ?? rawQuote.requestedSymbol
      ?? rawQuote.symbol
      ?? rawQuote.providerSymbol
      ?? rawQuote.providerSymbolUsed,
    assetClass,
  );
  const providerText = String(rawQuote.provider ?? rawQuote.source ?? '').toLowerCase();
  const rawProviderSymbol = textOrNull(rawQuote.providerSymbol ?? rawQuote.providerSymbolUsed ?? rawQuote.symbolUsed);
  const providerSymbol = symbol.assetType === 'crypto' && providerText.includes('yahoo')
    ? symbol.providerSymbol
    : rawProviderSymbol ?? symbol.providerSymbol;
  const providerSymbolUsed = symbol.assetType === 'crypto' && providerText.includes('yahoo')
    ? symbol.providerSymbol
    : textOrNull(rawQuote.providerSymbolUsed ?? rawQuote.symbolUsed) ?? providerSymbol;

  const rawPrice = firstFiniteNumber(
    rawQuote.price,
    rawQuote.currentPrice,
    rawQuote.latestPrice,
    rawQuote.lastPrice,
    rawQuote.regularMarketPrice,
    rawQuote.close,
  );
  const price = isValidPrice(rawPrice) ? roundQuoteNumber(rawPrice) : null;
  const rawPreviousClose = firstFiniteNumber(
    rawQuote.previousClose,
    rawQuote.prevClose,
    rawQuote.priorClose,
    rawQuote.regularMarketPreviousClose,
  );
  const previousClose = isValidPrice(rawPreviousClose) ? roundQuoteNumber(rawPreviousClose) : null;
  const explicitChangePercent = firstFiniteNumber(
    rawQuote.changePercent,
    rawQuote.percentChange,
    rawQuote.regularMarketChangePercent,
  );
  const change = price !== null && previousClose !== null
    ? roundQuoteNumber(price - previousClose)
    : null;
  const changePercent = price !== null && previousClose !== null
    ? roundQuoteNumber(((price - previousClose) / previousClose) * 100)
    : isValidChange(explicitChangePercent) && price !== null
      ? roundQuoteNumber(explicitChangePercent)
      : null;
  const available = rawQuote.available !== false && price !== null;

  return {
    ...symbol,
    providerSymbol,
    providerSymbolUsed,
    price,
    currentPrice: price,
    previousClose,
    change,
    changePercent,
    available,
    unavailableReason: available
      ? null
      : textOrNull(rawQuote.unavailableReason) ?? 'price_unavailable',
  };
}

export function normalizedQuoteKey(quote: Pick<NormalizedQuote, 'canonicalSymbol' | 'displaySymbol' | 'requestedSymbol' | 'inputSymbol'>) {
  return compactSymbol(quote.canonicalSymbol || quote.displaySymbol || quote.requestedSymbol || quote.inputSymbol);
}

export function rankQuotesByChange<T extends RawQuoteForNormalization>(
  quotes: T[],
  direction: QuoteDirection,
  limit: number,
  excludedSymbols = new Set<string>(),
): Array<T & NormalizedQuote> {
  const seen = new Set(Array.from(excludedSymbols).map(compactSymbol));
  const rows: Array<{ item: T & NormalizedQuote; changePercent: number; key: string }> = [];

  for (const quote of quotes) {
    const normalized = normalizeQuote(quote);
    const key = normalizedQuoteKey(normalized);
    if (!key || seen.has(key) || !normalized.available || !isValidChange(normalized.changePercent)) continue;
    if (direction === 'desc' && normalized.changePercent <= 0) continue;
    if (direction === 'asc' && normalized.changePercent >= 0) continue;
    seen.add(key);
    rows.push({ item: { ...quote, ...normalized }, changePercent: normalized.changePercent, key });
  }

  return rows
    .sort((a, b) => direction === 'asc'
      ? a.changePercent - b.changePercent || a.key.localeCompare(b.key)
      : b.changePercent - a.changePercent || a.key.localeCompare(b.key))
    .slice(0, limit)
    .map(row => row.item);
}
