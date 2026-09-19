import type { SfmMarketQuote } from '@/lib/sfm-market/types';
import type { TvQuote } from './types';
export function quoteStatus(quote: Pick<TvQuote, 'price' | 'observedAt' | 'status'>, now = Date.now()): TvQuote['status'] {
  if (quote.price === null || !Number.isFinite(quote.price) || quote.price <= 0) return 'unavailable';
  const observed = quote.observedAt ? Date.parse(quote.observedAt) : NaN;
  if (!Number.isFinite(observed) || observed > now + 60_000) return 'unknown_time';
  if (now - observed > 15 * 60_000 || quote.status === 'stale') return 'stale';
  return quote.status;
}
export function toTvQuote(symbol: string, row: SfmMarketQuote | null, nameAr?: string, now = Date.now()): TvQuote {
  const valid = row?.quality.state !== 'unavailable' && typeof row?.price === 'number' && Number.isFinite(row.price)
    && row.price > 0 && typeof row.currency === 'string' && /^[A-Z]{3}$/.test(row.currency) && Boolean(row.provenance.upstreamProvider);
  const evidence = row?.provenance;
  const referenceOnly = row?.quality.state === 'stale' || evidence?.observation?.marketOpen === false
    || evidence?.observation?.precision === 'date';
  const quote: TvQuote = {
    symbol, name: row?.name || symbol, nameAr: nameAr || row?.name || symbol,
    price: valid ? row!.price : null, currency: valid ? row!.currency : null,
    changePercent: valid && typeof row?.changePercent === 'number' && Number.isFinite(row.changePercent) ? row.changePercent : null,
    source: evidence?.upstreamProviderName || evidence?.upstreamProvider || null,
    observedAt: evidence?.observation?.precision === 'unknown' ? null : evidence?.observedAt || null,
    receivedAt: evidence?.receivedAt || null, exchange: row?.exchange || null, country: row?.country || null,
    status: referenceOnly ? 'stale' : evidence?.delayType !== 'realtime' ? 'delayed' : 'available',
  };
  quote.status = quoteStatus(quote, now);
  return quote;
}
export function tvMovers(quotes: TvQuote[], now = Date.now()) {
  const eligible = quotes.filter(q => ['available', 'delayed'].includes(quoteStatus(q, now)) && q.changePercent !== null);
  return {
    gainers: eligible.filter(q => q.changePercent! > 0).sort((a, b) => b.changePercent! - a.changePercent!).slice(0, 3),
    losers: eligible.filter(q => q.changePercent! < 0).sort((a, b) => a.changePercent! - b.changePercent!).slice(0, 3),
  };
}
export function safeTvUrl(value: string): string | null {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}
