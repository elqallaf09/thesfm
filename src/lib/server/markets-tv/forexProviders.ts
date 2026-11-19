import 'server-only';
import { fetchYahooHistory } from '@/lib/market/fetchYahooHistory';
import { parseTiingoFxTop, tiingoFxTicker, verifiedYahooFx, yahooFxSymbol } from '@/lib/markets-tv/forexExternal';
import type { TvQuote } from '@/lib/markets-tv/types';
import type { TvAsset } from './catalog';

/* Forex sources other than Twelve Data. Each one fails closed and, when it runs
 * out of quota, sits out until its own window resets so the next source in the
 * chain answers instead. Twelve Data credits are shared with Gulf stock quotes,
 * so they are kept for when these sources cannot answer. */

const yahooCooldown = new Map<string, number>();
const yahooPending = new Map<string, Promise<TvQuote | null>>();

export async function yahooForexQuote(asset: TvAsset): Promise<TvQuote | null> {
  const symbol = yahooFxSymbol(asset);
  if (!symbol || (yahooCooldown.get('all') || 0) > Date.now()) return null;
  let work = yahooPending.get(symbol);
  if (!work) {
    work = fetchYahooHistory(symbol, 'forex', '1d', '5m', false, 3500).then(data => {
      if (!data.success) {
        if (data.retryAfterMs !== undefined) yahooCooldown.set('all', Date.now() + Math.max(60_000, data.retryAfterMs));
        return null;
      }
      return verifiedYahooFx(asset, data);
    }).catch(() => null).finally(() => yahooPending.delete(symbol));
    yahooPending.set(symbol, work);
  }
  return work;
}

// Tiingo FX: one request answers many pairs, so concurrent misses are batched.
const TIINGO_URL = 'https://api.tiingo.com/tiingo/fx/top';
const TIINGO_BATCH_MS = 30;
const TIINGO_MAX_TICKERS = 50;
let tiingoBlockedUntil = 0;
let tiingoQueue: { asset: TvAsset; resolve: (quote: TvQuote | null) => void }[] = [];
let tiingoTimer: ReturnType<typeof setTimeout> | null = null;

function tiingoKey() { return process.env.TIINGO_API_KEY?.trim() || ''; }

/** The free plan counts requests per clock hour; resume at the next hour. */
function nextHour(now = Date.now()) { return Math.floor(now / 3_600_000) * 3_600_000 + 3_600_000; }

async function flushTiingo() {
  tiingoTimer = null;
  const batch = tiingoQueue.splice(0, TIINGO_MAX_TICKERS);
  if (tiingoQueue.length) tiingoTimer = setTimeout(() => { void flushTiingo(); }, 0);
  if (!batch.length) return;
  const tickers = [...new Set(batch.map(item => tiingoFxTicker(item.asset)).filter(Boolean))];
  let quotes = new Map<string, TvQuote>();
  try {
    const response = await fetch(`${TIINGO_URL}?${new URLSearchParams({ tickers: tickers.join(',') })}`, {
      headers: { Authorization: `Token ${tiingoKey()}`, 'Content-Type': 'application/json' },
      cache: 'no-store', signal: AbortSignal.timeout(3500),
    });
    if (response.status === 429) tiingoBlockedUntil = nextHour();
    else if ([401, 403].includes(response.status)) tiingoBlockedUntil = Date.now() + 6 * 3_600_000;
    else if (response.ok) quotes = parseTiingoFxTop(await response.json(), batch.map(item => item.asset));
  } catch { /* Timeout or network failure: the next source answers. */ }
  for (const item of batch) item.resolve(quotes.get(item.asset.symbol) ?? null);
}

export async function tiingoForexQuote(asset: TvAsset): Promise<TvQuote | null> {
  if (!tiingoKey() || !tiingoFxTicker(asset) || tiingoBlockedUntil > Date.now()) return null;
  return new Promise(resolve => {
    tiingoQueue.push({ asset, resolve });
    if (!tiingoTimer) tiingoTimer = setTimeout(() => { void flushTiingo(); }, TIINGO_BATCH_MS);
  });
}

export function __resetTvForexProvidersForTests() {
  yahooCooldown.clear(); yahooPending.clear();
  tiingoBlockedUntil = 0; tiingoQueue = [];
  if (tiingoTimer) clearTimeout(tiingoTimer);
  tiingoTimer = null;
}
