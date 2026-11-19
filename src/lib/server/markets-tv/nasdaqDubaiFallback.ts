import 'server-only';
import { unstable_cache } from 'next/cache';
import { TV_NASDAQ_DUBAI_LISTINGS, TV_NASDAQ_DUBAI_COLUMNS, tvNasdaqDubaiIdentity, verifiedTvNasdaqDubaiQuote } from '@/lib/markets-tv/nasdaqDubaiQuote';
import { quoteStatus, toTvQuote } from '@/lib/markets-tv/quotes';
import type { TvQuote } from '@/lib/markets-tv/types';
import type { TvAsset } from './catalog';

type Batch = { payload: unknown; receivedAt: string; expiresAt: number };
const BATCH_TTL = 300_000;
const REVALIDATE_SECONDS = 240;
let cached: Batch | null = null;
let expires = 0;
let pending: Promise<Batch | null> | null = null;
// Negative cooldowns are process-local. The shared Next cache contains only
// successful batches and never stores an empty result for five minutes.
let blockedUntil = 0;
let nextReadAt = 0;

/** An actual dated observation outranks a price whose trade clock is unknown,
 * including a retained primary carrying a refresh failure or an old trade date. */
function timedPrimary(quote: TvQuote | null): quote is TvQuote {
  return quote !== null && quote.price !== null && Number.isFinite(quote.price) && quote.price > 0
    && Boolean(quote.source?.trim()) && quote.observation?.precision !== 'unknown'
    && quoteStatus(quote) !== 'unknown_time';
}

function failureTtl(response: Response): number {
  const minimum = response.status === 429 ? 60_000 : 30_000;
  if (response.status !== 429 && response.status !== 503) return minimum;
  const raw = response.headers.get('retry-after')?.trim();
  const wait = raw ? (/^\d+(\.\d+)?$/.test(raw) ? Number(raw) * 1000 : Date.parse(raw) - Date.now()) : NaN;
  return Math.max(minimum, Number.isFinite(wait) ? wait : 0);
}

async function fetchBatch(): Promise<Batch> {
  if (blockedUntil > Date.now()) throw new Error('TV_NASDAQ_DUBAI_BATCH_COOLDOWN');
  let ttl = 30_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch('https://scanner.tradingview.com/global/scan', {
      method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ symbols: { tickers: TV_NASDAQ_DUBAI_LISTINGS.map(item => `${item.exchange}:${item.ticker}`), query: { types: [] } },
        columns: TV_NASDAQ_DUBAI_COLUMNS, range: [0, TV_NASDAQ_DUBAI_LISTINGS.length] }),
      cache: 'no-store', redirect: 'error', signal: controller.signal,
    });
    ttl = failureTtl(response);
    if (!response.ok) throw new Error('TV_NASDAQ_DUBAI_BATCH_UNAVAILABLE');
    const payload: unknown = await response.json();
    const receivedAt = new Date().toISOString();
    if (!TV_NASDAQ_DUBAI_LISTINGS.some(item => verifiedTvNasdaqDubaiQuote({ ...item, name: item.ticker }, payload, receivedAt))) {
      throw new Error('TV_NASDAQ_DUBAI_BATCH_INVALID');
    }
    return { payload, receivedAt, expiresAt: Date.parse(receivedAt) + BATCH_TTL };
  } catch (error) {
    blockedUntil = Math.max(blockedUntil, Date.now() + ttl);
    throw error;
  } finally { clearTimeout(timeout); }
}

// Revalidate one minute before the hard expiry. Next can share a still-valid
// batch across cold instances while refreshing it, without changing its clocks.
const sharedBatch = unstable_cache(fetchBatch, ['tv-nasdaq-dubai-batch-v1'], { revalidate: REVALIDATE_SECONDS });

function currentBatch(batch: Batch | null): batch is Batch {
  if (!batch || !Number.isFinite(Date.parse(batch.receivedAt)) || batch.expiresAt !== Date.parse(batch.receivedAt) + BATCH_TTL
    || batch.expiresAt <= Date.now()) return false;
  return TV_NASDAQ_DUBAI_LISTINGS.some(item => verifiedTvNasdaqDubaiQuote({ ...item, name: item.ticker }, batch.payload, batch.receivedAt));
}

async function readBatch(): Promise<Batch | null> {
  if (expires > Date.now() && currentBatch(cached)) return cached;
  if (blockedUntil > Date.now() || nextReadAt > Date.now()) return currentBatch(cached) ? cached : null;
  if (pending) return pending;
  pending = (async () => {
    try {
      const batch = await sharedBatch();
      if (currentBatch(batch)) {
        cached = batch;
        const revalidateAt = Date.parse(batch.receivedAt) + REVALIDATE_SECONDS * 1000;
        // A late-joining instance uses the batch's age. At Next's exact stale
        // boundary a fresh read can still occur, so recheck within the grace minute.
        expires = Math.min(batch.expiresAt, revalidateAt > Date.now() ? revalidateAt : Date.now() + 30_000);
        nextReadAt = 0;
        return batch;
      }
    } catch { /* A failed refresh cannot extend the previous batch's deadline. */ }
    // An expired SWR entry may have a refresh in flight. Retry that shared read
    // shortly; this is not a provider quota reset and must not block the refresh.
    nextReadAt = Date.now() + 30_000;
    return currentBatch(cached) ? cached : null;
  })().finally(() => { pending = null; });
  return pending;
}

function retryableFailure(primary: TvQuote): TvQuote {
  if (primary.price !== null && Number.isFinite(primary.price) && primary.price > 0) return primary;
  const nextSecondary = Math.max(blockedUntil, nextReadAt, expires);
  if (nextSecondary <= Date.now()) return primary;
  const nextPrimary = Date.parse(primary.retryAt || '');
  const retryAt = Number.isFinite(nextPrimary) && nextPrimary > Date.now() ? Math.min(nextPrimary, nextSecondary) : nextSecondary;
  return { ...primary, retryAt: new Date(retryAt).toISOString() };
}

/** One bounded, shared Nasdaq Dubai request, independent of other market
 * cooldowns. Keep this adapter outside the cache of verified timed quotes:
 * scanner update_time is never promoted to the security's observation clock. */
export async function withTvNasdaqDubaiFallback(asset: TvAsset, primary: Promise<TvQuote>): Promise<TvQuote> {
  if (!tvNasdaqDubaiIdentity(asset)) return primary;
  let latest: TvQuote | null = null;
  let primaryRejected = false;
  const settled = primary.then(quote => { latest = quote; return quote; }, () => { primaryRejected = true; return null; });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const early = await Promise.race([settled, new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 500); })]);
  clearTimeout(timer);
  if (timedPrimary(early)) return early;
  const data = await readBatch();
  if (timedPrimary(latest)) return latest;
  const fallback = data && verifiedTvNasdaqDubaiQuote(asset, data.payload, data.receivedAt);
  if (fallback) return fallback;
  // A hung primary must not strand the caller's pending listing forever when
  // the secondary fails. Its separate verified-cache work can still finish.
  return retryableFailure(latest || {
    ...toTvQuote(asset.symbol, null, asset.nameAr), displaySymbol: asset.displaySymbol,
    name: asset.name, nameAr: asset.nameAr || asset.name, currency: asset.currency || null,
    exchange: asset.exchange || asset.region || null, country: asset.country || null,
    issue: primaryRejected ? 'provider_unavailable' : 'timeout',
  });
}
