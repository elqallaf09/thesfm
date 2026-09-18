import 'server-only';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
import { regionalQuoteIdentity } from '@/lib/market/regionalDirectory';
import { getRegionalDirectoryQuote } from './regionalDirectoryQuotes';

const cache = new Map<string, { quote: TechStockPrice; expires: number }>();
const pending = new Map<string, Promise<TechStockPrice>>();
let active = 0;
let blockedUntil = 0;
const waiting: Array<() => void> = [];

// These two suffix/exchange pairs were verified against the provider's actual
// chart metadata. Do not guess mappings for ADX or Egyptian ISIN identifiers.
function fallbackIdentity(symbol: string) {
  const identity = regionalQuoteIdentity(symbol);
  if (!identity) return null;
  if (identity.mic === 'XSAU') return { ...identity, providerSymbol: `${identity.symbol}.SR`, exchange: 'SAU' };
  if (identity.mic === 'DSMD' && /^[A-Z][A-Z0-9]{1,11}$/.test(identity.symbol)) return { ...identity, providerSymbol: `${identity.symbol}.QA`, exchange: 'DOH' };
  return null;
}

function numeric(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

async function fallback(symbol: string, original: TechStockPrice): Promise<TechStockPrice> {
  const identity = fallbackIdentity(symbol);
  if (!identity || blockedUntil > Date.now()) return original;
  if (active >= 3) {
    if (waiting.length >= 48) return original;
    await new Promise<void>(resolve => waiting.push(resolve));
  } else active++;
  try {
    if (blockedUntil > Date.now()) return original;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(identity.providerSymbol)}?range=1d&interval=1d`;
    const response = await fetch(url, {
      next: { revalidate: 300 }, signal: AbortSignal.timeout(6500),
      headers: { accept: 'application/json', 'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)' },
    });
    if (response.status === 429) blockedUntil = Date.now() + 60_000;
    if (!response.ok) return original;
    const data = await response.json();
    const meta = data?.chart?.result?.[0]?.meta as Record<string, unknown> | undefined;
    if (data?.chart?.error || !meta || meta.symbol !== identity.providerSymbol || meta.currency !== identity.currency || meta.exchangeName !== identity.exchange || meta.instrumentType !== 'EQUITY') return original;
    const price = numeric(meta.regularMarketPrice), timestamp = numeric(meta.regularMarketTime);
    if (price === null || price <= 0 || timestamp === null || timestamp <= 0 || timestamp * 1000 > Date.now() + 300_000 || Date.now() - timestamp * 1000 > 7 * 86_400_000) return original;
    const previous = numeric(meta.previousClose) ?? numeric(meta.chartPreviousClose);
    const change = previous !== null && previous > 0 ? price - previous : null;
    const changePercent = change !== null && previous ? change / previous * 100 : null;
    if (changePercent !== null && Math.abs(changePercent) >= 200) return original;
    return { symbol, price, change, changePercent, source: 'Yahoo Finance', available: true, delayed: true, asOf: new Date(timestamp * 1000).toISOString() };
  } catch {
    return original;
  } finally {
    const next = waiting.shift();
    if (next) next(); else active--;
  }
}

/** Directory reference prices only; this does not change the SFM v1 engine. */
export function getRegionalDirectoryPrice(symbol: string): Promise<TechStockPrice> {
  const saved = cache.get(symbol);
  if (saved && saved.expires > Date.now()) return Promise.resolve(saved.quote);
  const existing = pending.get(symbol);
  if (existing) return existing;
  const promise = getRegionalDirectoryQuote(symbol)
    .then(quote => quote.available ? quote : fallback(symbol, quote))
    .then(quote => {
      if (cache.size >= 512) cache.delete(cache.keys().next().value!);
      cache.set(symbol, { quote, expires: Date.now() + (quote.available ? 300_000 : 60_000) });
      return quote;
    }).finally(() => pending.delete(symbol));
  pending.set(symbol, promise);
  return promise;
}
