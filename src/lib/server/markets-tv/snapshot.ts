import 'server-only';
import { getSfmMarketQuote } from '@/lib/sfm-market/engine';
import { tvDirectoryAssets, type TvAsset } from './catalog';
import { providerRegion } from '@/lib/world-stocks/providerDirectory';
import { providerStockQuote } from '@/lib/world-stocks/providerQuote';
import { quoteStatus, toTvQuote } from '@/lib/markets-tv/quotes';
import type { TvGroup, TvSnapshot, TvQuote } from '@/lib/markets-tv/types';
import { cryptoTvQuotes, forexTvQuote } from './instruments';
export type TvSnapshotOptions = { page?: number; pageSize?: number; market?: string; symbols?: string[] };
export async function loadTvSnapshot(group: TvGroup, ownedSymbols: string[] = [], options: TvSnapshotOptions = {}): Promise<TvSnapshot> {
  const startedAt = Date.now();
  const directory: TvAsset[] = group === 'watchlist' ? [...new Set(ownedSymbols)].slice(0, 50).map(symbol => ({ symbol, name: symbol })) : await tvDirectoryAssets(group, options.market);
  // Resolve only identities belonging to this market (or the authenticated watchlist).
  const selected = options.symbols ? new Set(options.symbols) : null;
  const all = selected ? directory.filter(a => selected.has(a.symbol)) : directory;
  const pageSize = Math.max(1, Math.min(50, options.pageSize ?? 50));
  const page = Math.max(0, Math.min(options.page ?? 0, Math.max(0, Math.ceil(all.length / pageSize) - 1)));
  const assets = all.slice(page * pageSize, (page + 1) * pageSize);
  if (group === 'crypto') {
    const quotes = await cryptoTvQuotes(assets);
    return { group, quotes, generatedAt: new Date().toISOString(), available: quotes.filter(q => q.price !== null).length, total: assets.length, directoryTotal: all.length, page, pageSize, market: options.market };
  }
  const assetType = group === 'global' ? 'index' : group === 'commodities' ? 'commodity' : group === 'forex' ? group : undefined;
  const empty = (asset: TvAsset): TvQuote => ({ ...toTvQuote(asset.symbol, null, asset.nameAr), displaySymbol: asset.displaySymbol, name: asset.name, nameAr: asset.nameAr || asset.name, currency: asset.currency || null, country: asset.country || null, exchange: asset.region || null });
  const quotes = assets.map(empty), deadline = Math.min(Date.now() + 25_000, startedAt + 50_000);
  let cursor = 0;
  async function quote(asset: TvAsset) {
    if (group === 'forex') return forexTvQuote(asset);
    const primaryMic = ({ BOURSA_KUWAIT: 'XKUW', DFM: 'XDFM', NASDAQ_DUBAI: 'DIFX', SSE: 'XSHG', SZSE: 'XSHE' } as Record<string,string>)[asset.region || ''];
    if (providerRegion(asset.region) || primaryMic) {
      const mic = asset.mic || primaryMic;
      const symbol = primaryMic ? asset.symbol.replace(/\.(KW|DU|SS|SZ)$/i, '') : asset.symbol;
      const row = await providerStockQuote(primaryMic ? `TD_${primaryMic}` : asset.region!, symbol, mic ? { providerSymbol: symbol, mic, currency: asset.currency || undefined } : undefined);
      if (asset.currency && row.currency !== asset.currency) return empty(asset);
      const result: TvQuote = { ...empty(asset), price: row.price, changePercent: row.changePercent, source: row.dataSource, observedAt: row.quoteTimestamp, receivedAt: new Date().toISOString(), status: row.price === null ? 'unavailable' : 'delayed' };
      result.status = quoteStatus(result); return result;
    }
    const row = await getSfmMarketQuote(asset.symbol, { assetType, ...(['global','commodities'].includes(group) ? { excludeProviders: ['finnhub' as const] } : {}) });
    // Reject a foreign-listing fallback that lost its exchange suffix, or
    // any price whose denomination contradicts the exchange directory.
    if (row && (asset.currency && row.currency !== asset.currency || /\.(KW|DU|AD|QA|SR|SA|OM|BH)$/.test(asset.symbol) && row.provenance.providerSymbol === asset.symbol.split('.')[0])) return empty(asset);
    const result = toTvQuote(asset.symbol, row, asset.nameAr);
    return { ...result, displaySymbol: asset.displaySymbol, name: row?.name || asset.name, nameAr: asset.nameAr || row?.name || asset.name, currency: result.currency || asset.currency || null, exchange: result.exchange || asset.region || null };
  }
  async function worker() {
    while (cursor < assets.length && Date.now() < deadline) {
      const index = cursor++; let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        quotes[index] = await Promise.race([
          quote(assets[index]).catch(() => empty(assets[index])),
          new Promise<TvQuote>(resolve => { timer = setTimeout(() => resolve(empty(assets[index])), Math.min(12_000, deadline - Date.now())); }),
        ]);
      } finally { if (timer) clearTimeout(timer); }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, assets.length) }, () => worker()));
  return { group, quotes, generatedAt: new Date().toISOString(), available: quotes.filter(q => q.price !== null).length, total: assets.length, directoryTotal: all.length, page, pageSize, market: options.market };
}
