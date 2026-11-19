import type { YahooHistoryResult } from '@/lib/market/fetchYahooHistory';
import { quoteStatus } from './quotes';
import type { TvQuote } from './types';

/** A forex pair as the TV lists it: "EUR/USD". */
export type TvForexPair = { symbol: string; name: string; nameAr?: string; currency?: string | null; baseCurrency?: string; region?: string };

const PAIR = /^([A-Z]{3})\/([A-Z]{3})$/;

/** Splits a pair and checks it against the asset's own declared currencies. */
export function forexLegs(asset: TvForexPair): { base: string; quote: string } | null {
  const match = PAIR.exec(asset.symbol);
  if (!match || match[1] === match[2]) return null;
  if (asset.currency && asset.currency !== match[2]) return null;
  if (asset.baseCurrency && asset.baseCurrency !== match[1]) return null;
  return { base: match[1], quote: match[2] };
}

/** Yahoo lists every cross as BASEQUOTE=X; the reply must name that exact symbol. */
export function yahooFxSymbol(asset: TvForexPair): string | null {
  const legs = forexLegs(asset);
  return legs ? `${legs.base}${legs.quote}=X` : null;
}

function emptyPair(asset: TvForexPair): TvQuote {
  const legs = forexLegs(asset);
  return { symbol: asset.symbol, name: asset.name, nameAr: asset.nameAr || asset.name, price: null, currency: legs?.quote ?? asset.currency ?? null,
    changePercent: null, source: null, observedAt: null, receivedAt: null, status: 'unavailable', exchange: asset.region || null, country: null };
}

/** Verified Yahoo currency quote: exact symbol, CURRENCY type, quote-currency unit and a real clock. */
export function verifiedYahooFx(asset: TvForexPair, data: YahooHistoryResult, now = Date.now()): TvQuote | null {
  const symbol = yahooFxSymbol(asset), legs = forexLegs(asset);
  if (!symbol || !legs || !data.success || data.providerSymbol !== symbol) return null;
  const snapshot = data.quoteSnapshot;
  if (!snapshot || snapshot.symbol !== symbol || snapshot.assetType !== 'CURRENCY'
    || snapshot.currency !== legs.quote || data.currency !== legs.quote) return null;
  const observed = Date.parse(snapshot.marketTime || '');
  if (!Number.isFinite(observed) || observed > now + 60_000 || now - observed > 7 * 86_400_000
    || snapshot.price === null || !Number.isFinite(snapshot.price) || snapshot.price <= 0) return null;
  const previous = snapshot.previousClose;
  const quote: TvQuote = { ...emptyPair(asset), price: snapshot.price, currency: legs.quote,
    changePercent: previous !== null && Number.isFinite(previous) && previous > 0 ? (snapshot.price - previous) / previous * 100 : null,
    source: 'Yahoo Finance', observedAt: new Date(observed).toISOString(), receivedAt: data.retrievedAt || new Date(now).toISOString(),
    observation: { precision: 'instant', marketOpen: null }, delayType: 'delayed', changeBasis: 'session', status: 'delayed' };
  quote.status = quoteStatus(quote, now);
  return quote;
}

/** Tiingo's lower-case compact ticker for a pair, e.g. "eurusd". */
export function tiingoFxTicker(asset: TvForexPair): string | null {
  const legs = forexLegs(asset);
  return legs ? `${legs.base}${legs.quote}`.toLowerCase() : null;
}

/** Parses /tiingo/fx/top. Rows are matched by exact ticker; anything else is dropped. */
export function parseTiingoFxTop(payload: unknown, assets: TvForexPair[], now = Date.now()): Map<string, TvQuote> {
  const rows = new Map<string, Record<string, unknown>>();
  for (const row of Array.isArray(payload) ? payload : []) {
    if (row && typeof row === 'object' && typeof (row as Record<string, unknown>).ticker === 'string') {
      rows.set(String((row as Record<string, unknown>).ticker).toLowerCase(), row as Record<string, unknown>);
    }
  }
  const quotes = new Map<string, TvQuote>();
  for (const asset of assets) {
    const ticker = tiingoFxTicker(asset), legs = forexLegs(asset);
    const row = ticker ? rows.get(ticker) : undefined;
    if (!row || !legs) continue;
    const mid = Number(row.midPrice), bid = Number(row.bidPrice), ask = Number(row.askPrice);
    const price = Number.isFinite(mid) && mid > 0 ? mid : Number.isFinite(bid) && Number.isFinite(ask) && bid > 0 && ask >= bid ? (bid + ask) / 2 : NaN;
    // Only an explicit zone counts as an instant; a bare wall clock is ambiguous.
    const stamp = typeof row.quoteTimestamp === 'string' && /(?:Z|[+-]\d{2}:?\d{2})$/i.test(row.quoteTimestamp) ? Date.parse(row.quoteTimestamp) : NaN;
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(stamp) || stamp > now + 60_000 || now - stamp > 7 * 86_400_000) continue;
    const quote: TvQuote = { ...emptyPair(asset), price, currency: legs.quote, source: 'Tiingo FX', observedAt: new Date(stamp).toISOString(),
      receivedAt: new Date(now).toISOString(), observation: { precision: 'instant', marketOpen: null }, delayType: 'realtime',
      changeBasis: 'session', status: 'available' };
    quote.status = quoteStatus(quote, now);
    quotes.set(asset.symbol, quote);
  }
  return quotes;
}
