import 'server-only';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';

export type SpecialQuote = TechStockPrice & { name?: string; currency?: string; assetType?: string };
const cache = new Map<string, { quote: SpecialQuote; expires: number }>();
const pending = new Map<string, Promise<SpecialQuote>>();

function numeric(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function verifiedUnderOne(quote: SpecialQuote | undefined) {
  const observed = Date.parse(quote?.asOf ?? '');
  return Boolean(quote?.available && quote.currency === 'USD' && quote.assetType === 'EQUITY'
    && quote.price !== null && quote.price > 0 && quote.price < 1
    && Number.isFinite(observed) && observed <= Date.now() + 60_000
    && Date.now() - observed < 4 * 86_400_000);
}

async function fetchQuote(symbol: string): Promise<SpecialQuote> {
  const unavailable: SpecialQuote = {
    symbol, price: null, change: null, changePercent: null, source: 'Yahoo Finance',
    delayed: true, available: false, asOf: null,
  };
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`, {
      next: { revalidate: 60 }, signal: AbortSignal.timeout(3_000),
      headers: { accept: 'application/json', 'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)' },
    });
    const body = await response.json();
    const meta = body?.chart?.result?.[0]?.meta;
    const price = numeric(meta?.regularMarketPrice);
    const previous = numeric(meta?.previousClose) ?? numeric(meta?.chartPreviousClose);
    const time = numeric(meta?.regularMarketTime);
    if (response.ok && String(meta?.symbol).toUpperCase() === symbol && price !== null && price > 0) {
      const change = previous !== null ? price - previous : null;
      return {
        ...unavailable, available: true, price, change,
        changePercent: change !== null && previous !== null && previous > 0 ? change / previous * 100 : null,
        asOf: time && time > 0 ? new Date(time * 1000).toISOString() : null,
        name: meta.longName || meta.shortName || symbol, currency: meta.currency,
        assetType: meta.instrumentType,
      };
    }
  } catch { /* Fall through to the configured provider within the same budget. */ }
  const token = process.env.FINNHUB_API_KEY?.trim();
  if (token && /^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)) {
    try {
      const url = new URL('https://finnhub.io/api/v1/quote');
      url.search = new URLSearchParams({ symbol, token }).toString();
      const response = await fetch(url, { next: { revalidate: 60 }, signal: AbortSignal.timeout(1_500) });
      const quote = await response.json();
      const price = numeric(quote?.c);
      const time = numeric(quote?.t);
      if (response.ok && price !== null && price > 0) return {
        ...unavailable, source: 'Finnhub', available: true, price,
        change: numeric(quote.d), changePercent: numeric(quote.dp),
        asOf: time && time > 0 ? new Date(time * 1000).toISOString() : null,
        // This endpoint doesn't establish currency or instrument type. Such a
        // quote may display, but cannot certify the under-$1 classification.
      };
    } catch { /* Preserve an explicit unavailable quote, never a made-up price. */ }
  }
  return unavailable;
}

export async function fetchSpecialQuotes(symbols: string[]) {
  const unique = [...new Set(symbols.map(symbol => symbol.trim().toUpperCase()))]
    .filter(symbol => /^[A-Z][A-Z0-9.=^-]{0,14}$/.test(symbol)).slice(0, 18);
  const quotes = await Promise.all(unique.map(async symbol => {
    const saved = cache.get(symbol);
    if (saved && saved.expires > Date.now()) return saved.quote;
    let request = pending.get(symbol);
    if (!request) {
      request = fetchQuote(symbol).then(quote => {
        if (cache.size >= 500) cache.delete(cache.keys().next().value!);
        cache.set(symbol, { quote, expires: Date.now() + (quote.available ? 60_000 : 15_000) });
        return quote;
      }).finally(() => pending.delete(symbol));
      pending.set(symbol, request);
    }
    return request;
  }));
  return new Map(quotes.map(quote => [quote.symbol, quote]));
}
