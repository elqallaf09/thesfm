import type { SfmMarketQuote } from '@/lib/sfm-market/types';
import type { TvQuote } from './types';
import { quoteStatus } from './quote-status';
export { quoteStatus } from './quote-status';
export function toTvQuote(symbol: string, row: SfmMarketQuote | null, nameAr?: string, now = Date.now()): TvQuote {
  const validUnit = row?.assetType === 'index' || typeof row?.currency === 'string'
    && (row.assetType === 'crypto' ? /^[A-Z0-9]{2,12}$/ : /^[A-Z]{3}$/).test(row.currency);
  const valid = row?.quality.state !== 'unavailable' && typeof row?.price === 'number' && Number.isFinite(row.price)
    && row.price > 0 && validUnit && Boolean(row.provenance.upstreamProvider);
  const evidence = row?.provenance;
  const closing = evidence?.observation?.marketOpen === false || evidence?.delayType === 'eod';
  const referenceOnly = evidence?.observation?.precision === 'date';
  const quote: TvQuote = {
    symbol, name: row?.name || symbol, nameAr: nameAr || row?.name || symbol,
    price: valid ? row!.price : null, currency: valid ? row!.currency : null,
    changePercent: valid && typeof row?.changePercent === 'number' && Number.isFinite(row.changePercent) ? row.changePercent : null,
    source: evidence?.upstreamProviderName || evidence?.upstreamProvider || null,
    observedAt: evidence?.observation?.precision === 'unknown' ? null : evidence?.observedAt || null,
    receivedAt: evidence?.receivedAt || null, exchange: row?.exchange || null, country: row?.country || null,
    observation: evidence?.observation, delayType: evidence?.delayType ?? null, changeBasis: referenceOnly && !closing ? 'reference' : 'session',
    status: closing ? 'closed' : referenceOnly ? 'reference' : row?.quality.state === 'stale' ? 'stale'
      : evidence?.delayType === 'realtime' ? 'available' : evidence?.delayType === 'delayed' ? 'delayed' : 'unknown_delay',
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
export { safeTvUrl } from './safeUrl';
