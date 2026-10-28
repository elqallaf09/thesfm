import 'server-only';
import { getSfmMarketQuote } from '@/lib/sfm-market/engine';
import type { SfmMarketQuote } from '@/lib/sfm-market/types';
import type { ProviderAttemptFailure } from '@/lib/market/marketDataProviders';
import { providerRegion } from '@/lib/world-stocks/providerDirectory';
import { providerStockQuote } from '@/lib/world-stocks/providerQuote';
import { quoteStatus, toTvQuote } from '@/lib/markets-tv/quotes';
import type { TvGroup, TvQuote } from '@/lib/markets-tv/types';
import type { TvAsset } from './catalog';
import { cryptoTvQuotes, forexTvQuote } from './instruments';
import { tvProviderFailure } from './quoteAvailability';
import { finnhubUsMarketOpen } from './finnhubMarketStatus';

const PRIMARY_MIC: Record<string, string> = {
  BOURSA_KUWAIT: 'XKUW', DFM: 'XDFM', NASDAQ_DUBAI: 'DIFX', SSE: 'XSHG', SZSE: 'XSHE',
  TADAWUL: 'XSAU', ADX: 'XADS', QSE: 'DSMD', BAHRAIN_BOURSE: 'XBAH', BAHRAIN: 'XBAH', MUSCAT: 'XMUS', MSX: 'XMUS',
};
const empty = (asset: TvAsset, issue: TvQuote['issue'] = 'provider_unavailable'): TvQuote => ({
  ...toTvQuote(asset.symbol, null, asset.nameAr), displaySymbol: asset.displaySymbol,
  name: asset.name, nameAr: asset.nameAr || asset.name, currency: asset.currency || null,
  country: asset.country || null, exchange: asset.exchange || asset.region || null, issue,
});

/** A fallback must retain the requested listing, not just a similar ticker. */
export function tvQuoteIdentityMatches(asset: TvAsset, row: SfmMarketQuote): boolean {
  if (asset.currency && row.currency !== asset.currency) return false;
  const requested = asset.symbol.toUpperCase(), supplied = row.provenance.providerSymbol?.toUpperCase();
  if (!supplied) return false;
  if (row.symbol && row.symbol.toUpperCase() !== requested && (!asset.assetType || asset.assetType === 'stock')) return false;
  if (asset.assetType === 'crypto' || asset.assetType === 'forex') {
    const compact = (symbol: string) => symbol.split(':').at(-1)!.replace(/=X$/, '').replace(/[-/_]/g, '');
    // In particular, BTC/USD and BTC/USDT are different denominations.
    if (compact(requested) !== compact(supplied)) return false;
    const quoteCurrency = asset.assetType === 'forex' ? compact(requested).slice(-3)
      : compact(requested).match(/(USDT|USD)$/)?.[0];
    if (quoteCurrency && row.currency !== quoteCurrency) return false;
  }
  if (/\.(KW|DU|AD|AE|QA|SR|SA|OM|BH|T|SS|SZ|HK|AS|DE|SW|PA|L|CO|NS|KS)$/.test(requested)) {
    // Market-specific Twelve Data responses use the stricter MIC path below.
    // Generic provider fallbacks may only retain a fully qualified identity.
    if (supplied !== requested) return false;
  }
  if (asset.exchange && ['NASDAQ', 'NYSE'].includes(asset.exchange) && row.exchange) {
    const exchange = row.exchange.toUpperCase();
    const matching = asset.exchange === 'NASDAQ' ? /NASDAQ|XNAS|NMS|NGM|NCM/.test(exchange) : /NYSE|XNYS|NYQ/.test(exchange);
    if (!matching) return false;
  }
  if (asset.assetType === 'index' && requested.startsWith('^')) {
    const indices: Record<string, string[]> = { '^GSPC': ['^GSPC', 'GSPC', 'SPX'], '^DJI': ['^DJI', 'DJI'], '^NDX': ['^NDX', 'NDX'],
      '^FTSE': ['^FTSE', 'FTSE'], '^GDAXI': ['^GDAXI', 'GDAXI', 'DAX'], '^N225': ['^N225', 'N225', 'NIKKEI225'] };
    if (supplied.includes(':')) {
      const exchanges: Record<string, string> = { '^FTSE': 'LSE', '^GDAXI': 'XETR', '^N225': 'JPX' };
      const [base, exchange] = supplied.split(':');
      if (row.provenance.upstreamProvider !== 'twelve_data' || exchange !== exchanges[requested] || !indices[requested]?.includes(base)) return false;
    } else if (!indices[requested]?.includes(supplied)) return false;
  }
  if (/^[A-Z]{1,6}(?:[.-][AB])?$/.test(requested) && (!asset.assetType || asset.assetType === 'stock')) {
    const vendorSymbol = supplied.split(':')[0].replace(/\.US$/, '').replace(/\./g, '-');
    if (vendorSymbol !== requested.replace(/\./g, '-')) return false;
  }
  // A spot-metal alias must never silently replace a futures contract.
  if (requested.endsWith('=F') && supplied !== requested) return false;
  return true;
}

const pendingQuotes = new Map<string, Promise<TvQuote>>();
async function loadQuote(asset: TvAsset, group: TvGroup): Promise<TvQuote> {
  const assetType = asset.assetType || (group === 'global' ? 'index' : group === 'commodities' ? 'commodity' : group === 'forex' ? 'forex' : undefined);
  if (assetType === 'forex') return forexTvQuote(asset);
  const primaryMic = PRIMARY_MIC[asset.region || ''];
  if (providerRegion(asset.region) || primaryMic || asset.mic) {
    const mic = asset.mic || primaryMic;
    const symbol = asset.providerSymbol || (primaryMic ? asset.symbol.replace(/\.(KW|DU|AD|AE|QA|SR|SA|OM|BH|SS|SZ)$/i, '') : asset.symbol);
    const row = await providerStockQuote(mic ? `TD_${mic}` : asset.region!, symbol,
      mic ? { providerSymbol: symbol, mic, currency: asset.currency || undefined } : undefined);
    if (row.price !== null && asset.currency && row.currency !== asset.currency) return empty(asset, 'identity_mismatch');
    const result: TvQuote = { ...empty(asset), price: row.price, changePercent: row.changePercent,
      source: row.dataSource, observedAt: row.quoteTimestamp, receivedAt: row.receivedAt || null,
      observation: row.observation, delayType: row.delayType ?? 'delayed', retryAt: row.retryAt,
      changeBasis: 'session', issue: row.issue || (row.price === null ? 'provider_unavailable' : undefined),
      status: row.price === null ? 'unavailable' : row.delayType === 'eod' || row.observation?.marketOpen === false ? 'closed' : 'delayed' };
    result.status = quoteStatus(result); return result;
  }
  let attempts: ProviderAttemptFailure[] = [];
  const knownUsStock = (assetType === 'stock' || !assetType && group === 'us') && (asset.country === 'US' || asset.region === 'US' || ['NASDAQ', 'NYSE'].includes(asset.exchange || ''));
  const row = await getSfmMarketQuote(asset.symbol, { assetType, onQuoteAttempts: value => { attempts = value; },
    ...(asset.region ? { market: asset.region } : {}),
    ...(knownUsStock ? { preferredProviders: ['finnhub' as const] } : {}),
    ...(['index', 'commodity'].includes(assetType || '') ? { excludeProviders: ['finnhub' as const] } : {}),
  });
  if (!row) return { ...empty(asset), ...tvProviderFailure(attempts) };
  const resolvedType = assetType || (row.assetType === 'gold' ? 'commodity' : row.assetType === 'etf' ? 'stock' : row.assetType);
  if (!tvQuoteIdentityMatches({ ...asset, assetType: resolvedType }, row)) return empty(asset, 'identity_mismatch');
  const marketOpen = row.provenance.upstreamProvider === 'finnhub' && knownUsStock ? await finnhubUsMarketOpen() : null;
  const observedRow = marketOpen === null ? row : { ...row, provenance: { ...row.provenance,
    observation: { precision: row.provenance.observedAt ? 'instant' as const : 'unknown' as const, marketOpen } } };
  const result = toTvQuote(asset.symbol, observedRow, asset.nameAr);
  const retainedFailure = row.provenance.cached && attempts.some(attempt => attempt.provider === row.provenance.upstreamProvider)
    ? tvProviderFailure(attempts) : {};
  const quote = { ...result, ...retainedFailure, displaySymbol: asset.displaySymbol, name: asset.name || row.name || asset.symbol,
    nameAr: asset.nameAr || row.name || asset.name, currency: result.currency || asset.currency || null,
    country: asset.country || result.country, exchange: asset.exchange || asset.region || result.exchange,
    ...(result.price === null ? { issue: 'invalid_quote' as const } : {}),
  };
  quote.status = quoteStatus(quote); return quote;
}
function sharedQuote(asset: TvAsset, group: TvGroup): Promise<TvQuote> {
  const key = JSON.stringify([group, asset.symbol, asset.region, asset.exchange, asset.mic, asset.currency, asset.assetType]);
  const running = pendingQuotes.get(key); if (running) return running;
  const work = loadQuote(asset, group).catch(() => empty(asset)).finally(() => pendingQuotes.delete(key));
  pendingQuotes.set(key, work); return work;
}

export async function resolveTvQuotes(assets: TvAsset[], group: TvGroup): Promise<TvQuote[]> {
  const quotes = assets.map(asset => empty(asset, 'timeout'));
  const deadline = Date.now() + 9_000;
  const crypto = assets.map((asset, index) => ({ asset, index })).filter(({ asset }) => asset.assetType === 'crypto' || group === 'crypto');
  const cryptoWork = crypto.length ? cryptoTvQuotes(crypto.map(item => item.asset)).then(rows => {
    for (let i = 0; i < crypto.length; i++) quotes[crypto[i].index] = rows[i] || empty(crypto[i].asset);
  }) : Promise.resolve();
  const ordinary = assets.map((asset, index) => ({ asset, index })).filter(item => !crypto.some(coin => coin.index === item.index));
  let cursor = 0;
  async function worker() {
    while (cursor < ordinary.length && Date.now() < deadline) {
      const { asset, index } = ordinary[cursor++]; let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        quotes[index] = await Promise.race([
          sharedQuote(asset, group),
          new Promise<TvQuote>(resolve => { timer = setTimeout(() => resolve(empty(asset, 'timeout')), Math.min(6_500, deadline - Date.now())); }),
        ]);
      } finally { if (timer) clearTimeout(timer); }
    }
  }
  await Promise.all([cryptoWork, ...Array.from({ length: Math.min(4, ordinary.length) }, () => worker())]);
  return quotes;
}
