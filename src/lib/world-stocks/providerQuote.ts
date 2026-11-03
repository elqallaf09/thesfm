import 'server-only';
import { getProviderDirectory, type ProviderListing } from './providerDirectory';
import type { WorldStockQuote } from './types';
import { twelveDataObservation } from '@/lib/market/quoteObservation';
import { twelveDataFetch, TWELVE_RETRY_HEADER } from '@/lib/server/twelve-data-fetch';
import { fetchYahooNormalizedQuote } from '@/lib/market/fetchYahooQuote';
import { getPersistentCache, setPersistentCache } from '@/lib/trader/persistentCache';
const cache = new Map<string, { expires: number; result: WorldStockQuote }>();
const pending = new Map<string, Promise<WorldStockQuote>>();
type Failure = NonNullable<WorldStockQuote['issue']>;

// Yahoo lists these primary exchanges under a fixed suffix. Bahrain and Muscat
// are left out on purpose: their Yahoo coverage is too thin to trust.
const YAHOO_SUFFIX: Record<string, string> = { XKUW: '.KW', XSAU: '.SR', XDFM: '.AE', XADS: '.AE', DSMD: '.QA' };

/** Second source when Twelve Data is rate limited or unavailable. The listing
 * must match exactly (symbol and currency); Kuwait fils are converted to KWD. */
async function yahooFallback(listing: Pick<ProviderListing, 'providerSymbol' | 'mic' | 'currency'>): Promise<WorldStockQuote | null> {
  const suffix = YAHOO_SUFFIX[listing.mic || ''];
  if (!suffix || !listing.providerSymbol || !listing.currency) return null;
  const symbol = `${listing.providerSymbol}${suffix}`;
  try {
    const quote = await fetchYahooNormalizedQuote({ requestedSymbol: symbol, symbols: [symbol], name: symbol, assetClass: 'stock' });
    if (!quote.available || quote.price === null || quote.price <= 0 || quote.symbolUsed?.toUpperCase() !== symbol.toUpperCase()) return null;
    let { price, change } = quote, currency = quote.currency?.toUpperCase() || null;
    if (listing.mic === 'XKUW' && (currency === 'KWF' || currency === 'KWD' && price >= 10)) {
      price /= 1000; change = change === null ? null : change / 1000; currency = 'KWD';
    }
    if (currency !== listing.currency) return null;
    if (quote.marketTime && Date.parse(quote.marketTime) > Date.now() + 60000) return null;
    return { price, change, changePercent: quote.changePercent, currency, quoteTimestamp: quote.marketTime,
      delayType: 'delayed', receivedAt: new Date().toISOString(), delayed: true, dataSource: 'Yahoo Finance', status: 'available' };
  } catch { return null; }
}

// Last good observation per listing, shared across serverless instances so a
// provider cooldown shows the previous price with its original time, not a gap.
const durableKey = (id: string) => `tv-last-quote:${id}`;
const durableWritten = new Map<string, number>();
const DURABLE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
function rememberQuote(id: string, quote: WorldStockQuote) {
  if (quote.price === null || (durableWritten.get(id) || 0) > Date.now() - 300_000) return;
  durableWritten.set(id, Date.now());
  void setPersistentCache(durableKey(id), quote, DURABLE_TTL_MS);
}
export async function providerStockQuote(region: string, symbol: string, suppliedListing?: Pick<ProviderListing, 'providerSymbol' | 'mic' | 'currency'>): Promise<WorldStockQuote> {
  const id = `${region}:${symbol}:${suppliedListing?.mic || ''}:${suppliedListing?.currency || ''}`, previous = cache.get(id);
  if (previous && previous.expires > Date.now()) return previous.result;
  const running = pending.get(id); if (running) return running;
  const work = (async (): Promise<WorldStockQuote> => {
    const listing = suppliedListing || (await getProviderDirectory()).rows.find(row => row.exchange === region && (row.symbol === symbol || row.providerSymbol === symbol));
    const unavailable: WorldStockQuote = { price: null, change: null, changePercent: null, currency: listing?.currency || null, quoteTimestamp: null, delayed: true, dataSource: null, status: 'unavailable' };
    const failed = (issue: Failure, retryAt?: string | null) => ({ ...unavailable, issue, retryAt });
    const key = process.env.TWELVE_DATA_API_KEY?.trim();
    if (!listing) return failed('provider_unavailable');
    if (!key) return failed('not_configured');
    try {
      const params = new URLSearchParams({ symbol: listing.providerSymbol!, mic_code: listing.mic, apikey: key, timezone: 'UTC' });
      const response = await twelveDataFetch(`https://api.twelvedata.com/quote?${params}`, { signal: AbortSignal.timeout(6500) });
      const data = await response.json().catch(() => null);
      const code = [401, 403, 429].find(value => response.status === value || Number(data?.code) === value);
      if (code) {
        const issue = code === 429 ? 'rate_limited' : 'access_denied';
        return failed(issue, response.headers.get(TWELVE_RETRY_HEADER));
      }
      if (!response.ok || !data || data.status === 'error') return failed('provider_unavailable');
      if (data.symbol !== listing.providerSymbol || data.mic_code !== listing.mic || data.currency !== listing.currency) return failed('identity_mismatch');
      const numeric = (value: unknown) => (typeof value === 'number' || typeof value === 'string' && value.trim()) && Number.isFinite(Number(value)) ? Number(value) : null;
      const price = numeric(data.close);
      if (price === null || price <= 0) return failed('invalid_quote');
      const { lastUpdated, observation, delayType } = twelveDataObservation(data);
      if (lastUpdated && Date.parse(lastUpdated) > Date.now() + 60000) return failed('invalid_quote');
      return { price, change: numeric(data.change), changePercent: numeric(data.percent_change), currency: listing.currency!, quoteTimestamp: lastUpdated,
        // Twelve Data's published XKUW coverage is EOD even during the session.
        observation, delayType: listing.mic === 'XKUW' ? 'eod' : delayType,
        receivedAt: new Date().toISOString(), delayed: true, dataSource: 'Twelve Data', status: 'available' as const };
    } catch (error) { return failed(error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name) ? 'timeout' : 'provider_unavailable'); }
  })().then(async primary => {
    if (primary.price !== null || primary.issue === 'identity_mismatch' || primary.issue === 'invalid_quote') return primary;
    const listing = suppliedListing || (await getProviderDirectory()).rows.find(row => row.exchange === region && (row.symbol === symbol || row.providerSymbol === symbol));
    const fallback = listing ? await yahooFallback(listing) : null;
    if (fallback) return fallback;
    if (previous?.result.price != null) return primary;
    // Nothing in this instance: reuse the last stored observation, still
    // marked with the provider issue and its original source timestamp.
    const stored = await getPersistentCache<WorldStockQuote>(durableKey(id));
    return stored?.price != null ? { ...stored, status: 'unavailable' as const, issue: primary.issue, retryAt: primary.retryAt } : primary;
  }).then(result => {
    if (result.status === 'available') rememberQuote(id, result);
    if (cache.size >= 1000) cache.delete(cache.keys().next().value!);
    // Preserve the last source/receive clocks on failed refresh; callers can
    // distinguish a retained observation from a successful provider response.
    const retained = result.price === null && previous?.result.price != null
      ? { ...previous.result, status: 'unavailable' as const, issue: result.issue || 'provider_unavailable' as const, retryAt: result.retryAt } : result;
    const ttl = result.price === null || result.status === 'unavailable' ? Math.min(300_000, Math.max(30_000, Date.parse(result.retryAt || '') - Date.now() || 0))
      : result.delayType === 'eod' ? 300_000 : 15_000;
    cache.set(id, { result: retained, expires: Date.now() + ttl }); return retained;
  }).finally(() => pending.delete(id));
  pending.set(id, work); return work;
}
