import 'server-only';
import { getProviderDirectory, type ProviderListing } from './providerDirectory';
import type { WorldStockQuote } from './types';
import { twelveDataObservation } from '@/lib/market/quoteObservation';
const cache = new Map<string, { expires: number; result: WorldStockQuote }>();
const pending = new Map<string, Promise<WorldStockQuote>>();
let blockedUntil = 0;
const blockedMarkets = new Map<string, number>();
export async function providerStockQuote(region: string, symbol: string, suppliedListing?: Pick<ProviderListing, 'providerSymbol' | 'mic' | 'currency'>): Promise<WorldStockQuote> {
  const id = `${region}:${symbol}`, previous = cache.get(id);
  if (previous && previous.expires > Date.now()) return previous.result;
  const running = pending.get(id); if (running) return running;
  const work = (async () => {
    const listing = suppliedListing || (await getProviderDirectory()).rows.find(row => row.exchange === region && (row.symbol === symbol || row.providerSymbol === symbol));
    const unavailable: WorldStockQuote = { price: null, change: null, changePercent: null, currency: listing?.currency || null, quoteTimestamp: null, delayed: true, dataSource: null, status: 'unavailable' };
    const key = process.env.TWELVE_DATA_API_KEY?.trim();
    if (!listing || !key || blockedUntil > Date.now() || (blockedMarkets.get(region) || 0) > Date.now()) return unavailable;
    try {
      const params = new URLSearchParams({ symbol: listing.providerSymbol!, mic_code: listing.mic, apikey: key, timezone: 'UTC' });
      const response = await fetch(`https://api.twelvedata.com/quote?${params}`, { cache: 'no-store', signal: AbortSignal.timeout(6500) });
      const data = await response.json();
      if ([401,429].includes(response.status) || [401,429].includes(Number(data.code))) blockedUntil = Date.now() + 60000;
      if (response.status === 403 || Number(data.code) === 403) blockedMarkets.set(region, Date.now() + 60000);
      if (!response.ok || data.status === 'error' || data.symbol !== listing.providerSymbol || data.mic_code !== listing.mic || data.currency !== listing.currency) return unavailable;
      const numeric = (value: unknown) => (typeof value === 'number' || typeof value === 'string' && value.trim()) && Number.isFinite(Number(value)) ? Number(value) : null;
      const price = numeric(data.close);
      if (price === null || price <= 0) return unavailable;
      const { lastUpdated } = twelveDataObservation(data);
      if (lastUpdated && Date.parse(lastUpdated) > Date.now() + 60000) return unavailable;
      return { price, change: numeric(data.change), changePercent: numeric(data.percent_change), currency: listing.currency!, quoteTimestamp: lastUpdated, delayed: true, dataSource: 'Twelve Data', status: 'available' as const };
    } catch { return unavailable; }
  })().then(result => {
    if (cache.size >= 1000) cache.delete(cache.keys().next().value!);
    const retained = result.price === null && previous?.result.price != null ? previous.result : result;
    cache.set(id, { result: retained, expires: Date.now() + (result.price === null ? 30000 : 15000) }); return retained;
  }).finally(() => pending.delete(id));
  pending.set(id, work); return work;
}
