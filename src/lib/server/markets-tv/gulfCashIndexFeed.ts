import 'server-only';
import { TV_GULF_CASH_INDICES, type TvGulfCashIndex } from '@/lib/markets-tv/gulfCashIndices';
import { quoteStatus } from '@/lib/markets-tv/quotes';
import type { TvQuote } from '@/lib/markets-tv/types';

const columns = ['name', 'exchange', 'type', 'close', 'change', 'update_time', 'current_session', 'update_mode'];
type Batch = { payload: unknown; receivedAt: number };
let pending: Promise<Batch | null> | undefined;
let cached: Batch | null = null;
let retryAt = 0;

async function readBatch(): Promise<Batch | null> {
  const response = await fetch('https://scanner.tradingview.com/global/scan', {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ symbols: { tickers: TV_GULF_CASH_INDICES.map(index => index.symbol) }, columns }),
    cache: 'no-store', signal: AbortSignal.timeout(3500), redirect: 'error',
  });
  if (!response.ok) {
    const retry = response.headers.get('retry-after');
    if (retry) {
      const until = /^\d+$/.test(retry) ? Date.now() + Number(retry) * 1000 : Date.parse(retry);
      if (Number.isFinite(until)) retryAt = Math.max(retryAt, until);
    }
    return null;
  }
  return { payload: await response.json(), receivedAt: Date.now() };
}

export function verifiedGulfCashIndex(index: TvGulfCashIndex, payload: unknown, receivedAt: number): TvQuote | null {
  if (!payload || typeof payload !== 'object' || !('data' in payload) || !Array.isArray(payload.data)) return null;
  const matches = payload.data.filter(row => row?.s === index.symbol);
  if (matches.length !== 1 || !Array.isArray(matches[0].d) || matches[0].d.length !== columns.length) return null;
  const [ticker, exchange, type, price, change, timestamp, session, mode] = matches[0].d as unknown[];
  if (ticker !== index.displaySymbol || exchange !== index.exchange || type !== 'index'
    || typeof price !== 'number' || !Number.isFinite(price) || price <= 0
    || typeof timestamp !== 'number' || !Number.isSafeInteger(timestamp)) return null;
  const observed = timestamp * 1000;
  if (observed > receivedAt + 60_000 || receivedAt - observed > 7 * 86_400_000) return null;
  const marketOpen = session === 'out_of_session' ? false : session === 'regular' ? true : null;
  const delayed = typeof mode === 'string' && mode.startsWith('delayed_streaming');
  const quote: TvQuote = {
    ...index, currency: null, price, changePercent: typeof change === 'number' && Number.isFinite(change) ? change : null,
    source: 'TradingView', observedAt: new Date(observed).toISOString(), receivedAt: new Date(receivedAt).toISOString(),
    delayType: delayed ? 'delayed' : null, changeBasis: 'session', observation: { precision: 'instant', marketOpen },
    status: marketOpen === false ? 'closed' : delayed ? 'delayed' : 'unknown_delay',
  };
  return { ...quote, status: quoteStatus(quote, receivedAt) };
}

export async function loadTvGulfCashIndex(index: TvGulfCashIndex): Promise<TvQuote | null> {
  if (!pending && Date.now() >= retryAt) {
    retryAt = Date.now() + 60_000;
    pending = readBatch().catch(() => null).then(batch => { cached = batch; return batch; })
      .finally(() => { pending = undefined; });
  }
  const batch = pending ? await pending : cached;
  return batch && verifiedGulfCashIndex(index, batch.payload, batch.receivedAt);
}
