import { NextResponse } from 'next/server';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { TV_NEWS_TOPICS, type TvReceiverNewsChannel } from '@/lib/markets-tv/newsReceiver';
import { emptyNewsMovers, rankNewsMovers, type NewsMovers } from '@/lib/markets-tv/newsMovers';
import type { TvGroup } from '@/lib/markets-tv/types';
import { fetchStockCategoryMovers } from '@/lib/market/fetchStockCategoryMovers';
import { fetchCryptoMarketData } from '@/lib/market/fetchCryptoMarketData';
import { fetchSpecialQuotes } from '@/lib/market-news/specialQuotes';
import { underDollarTicker } from '@/lib/market-news/underDollarTicker.server';
import { newListingTicker } from '@/lib/market-news/newListingTicker.server';
import { TECH_STOCKS } from '@/lib/market/techStocks';
import { tvDirectoryAssets, type TvAsset } from '@/lib/server/markets-tv/catalog';
import { resolveTvQuotes } from '@/lib/server/markets-tv/quoteLoader';
import { quoteStatus } from '@/lib/markets-tv/quotes';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const categories: Partial<Record<TvReceiverNewsChannel, string>> = {
  energyNews:'energy', bankingNews:'banking', shariaNews:'sharia', growthNews:'growth',
  defensiveNews:'defensive', cyclicalNews:'cyclical', incomeNews:'dividend',
};
const regions: Partial<Record<TvReceiverNewsChannel, TvGroup>> = {
  news:'world', kuwait:'gulf', gulfNews:'gulf', europeNews:'europe', asiaNews:'asia',
};
const healthcare = ['LLY','JNJ','ABBV','MRK','PFE','AMGN'];
const events = ['earningsNews','analystNews','mergersNews','unusualNews'];
// Round-robin across venues rather than ranking the first exchange as the entire region.
function sampleDirectory(assets: TvAsset[], limit = 12) {
  const buckets = new Map<string, TvAsset[]>();
  for (const asset of assets) {
    if (asset.assetType !== 'stock') continue;
    const key = asset.exchange || asset.region || asset.country || '';
    const bucket = buckets.get(key) || [];
    if (bucket.length < limit) bucket.push(asset);
    buckets.set(key,bucket);
  }
  const result: TvAsset[] = [];
  for (let index = 0; index < limit && result.length < limit; index++) {
    for (const bucket of buckets.values()) {
      if (bucket[index]) result.push(bucket[index]);
      if (result.length === limit) break;
    }
  }
  return result;
}
async function build(channel: TvReceiverNewsChannel, params: URLSearchParams): Promise<NewsMovers> {
  const empty: NewsMovers = { channel, lists:emptyNewsMovers(), updatedAt:null, source:null };
  const result = (rows: readonly unknown[], source: string, updatedAt: string | null = null): NewsMovers =>
    ({ channel, lists:rankNewsMovers(rows), source, updatedAt });
  const category = categories[channel];
  if (category) {
    const data = await fetchStockCategoryMovers(category,5);
    if (!data.ok || data.category !== category) return empty;
    // The Sharia scanner is catalog-screened; never use a degraded watchlist as proof of compliance.
    if (channel === 'shariaNews' && (data.warnings?.includes('scanner_degraded_to_configured_watchlist') || !data.source.includes('Sharia screening catalog'))) return empty;
    return result([...data.data.topGainers,...data.data.topLosers,...data.data.highestVolume,...data.data.lowestVolume], data.source, data.updated_at);
  }
  if (channel === 'cryptoNews') {
    const data = await fetchCryptoMarketData();
    const rows = [...data.rankings.gainers,...data.rankings.losers,...data.rankings.mostTraded,...data.rankings.leastTraded].map(coin => ({
      symbol:coin.symbol, name:coin.name, exchange:'CRYPTO', currency:'USD', price:coin.price,
      changePercent:coin.changePercent24h, volume:coin.volume24h,
    }));
    return result(rows,data.source,data.updatedAt);
  }
  if (channel === 'underDollarNews') {
    const rows = await underDollarTicker();
    return result(rows,'TradingView');
  }
  if (channel === 'newStocksNews') {
    const data = await newListingTicker();
    return result(data.tickerItems,'Verified new listings');
  }
  const group = regions[channel];
  if (group) {
    const directory = await tvDirectoryAssets(group,channel === 'kuwait' ? 'BOURSA_KUWAIT' : undefined);
    const quotes = await resolveTvQuotes(sampleDirectory(directory),group);
    const rows = quotes.filter(q => q.source && q.observedAt && !q.issue && q.changeBasis !== 'reference'
      && ['available','delayed','closed','unknown_delay'].includes(quoteStatus(q)));
    return result(rows, [...new Set(rows.map(q => q.source).filter(Boolean))].join(' · ') || 'SFM TV');
  }
  const symbols = channel === 'technology' ? TECH_STOCKS.slice(0,18).map(s=>s.symbol)
    : channel === 'healthcareNews' ? healthcare
    : events.includes(channel) ? [...new Set((params.get('symbols') || '').split(',').filter(s=>/^[A-Z][A-Z0-9.-]{0,14}$/.test(s)))].slice(0,12) : [];
  if (!symbols.length) return empty; // Macro/metal/IPO headlines are not verified equity universes.
  const quotes = await fetchSpecialQuotes(symbols);
  const now = Date.now();
  const rows = [...quotes.values()].filter(q => {
    const observed = Date.parse(q.asOf || '');
    return q.available && q.assetType === 'EQUITY' && q.currency === 'USD' && observed <= now + 60_000 && observed >= now - 4*86_400_000;
  }).map(q => ({...q,name:q.name || q.symbol}));
  return result(rows,[...new Set(rows.map(q=>q.source))].join(' · ') || 'SFM');
}
export async function GET(request: Request) {
  const limited = rateLimitRequest(request,{prefix:'tv-news-movers',max:30}); if(limited) return limited;
  const params = new URL(request.url).searchParams, channel = params.get('channel') as TvReceiverNewsChannel;
  if (channel !== 'kuwait' && !TV_NEWS_TOPICS.includes(channel as typeof TV_NEWS_TOPICS[number])) return NextResponse.json({code:'INVALID_CHANNEL'},{status:400});
  try {
    const payload = await build(channel,params);
    return NextResponse.json(payload,{headers:{'cache-control':'public, s-maxage=60, stale-while-revalidate=120'}});
  } catch {
    return NextResponse.json({channel, lists:emptyNewsMovers(), updatedAt:null, source:null},{headers:{'cache-control':'public, s-maxage=15'}});
  }
}
