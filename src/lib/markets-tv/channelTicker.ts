import { TECH_STOCKS } from '../market/techStocks';
import { TV_NEWS_FEEDS, type TvReceiverNewsChannel } from './newsReceiver';
import type { TvQuote, TvSnapshot } from './types';

export const CATEGORY_TICKERS = {
  shariaNews: '/api/sharia-stocks/ticker', growthNews: '/api/growth-stocks/ticker',
  energyNews: '/api/energy-stocks/ticker', bankingNews: '/api/banking-stocks/ticker',
  incomeNews: '/api/dividend-stocks/ticker', cyclicalNews: '/api/cyclical-stocks/ticker',
  defensiveNews: '/api/defensive-stocks/ticker',
} as const;

const regionGroups = { europeNews: 'europe', gulfNews: 'gulf', asiaNews: 'asia', cryptoNews: 'crypto' } as const;
export const GLOBAL_INDEX_TICKER = '/api/tv/snapshot?group=global&scene=overview';
const symbolPattern = /^[A-Z][A-Z0-9.-]{0,14}$/;
function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export function channelTickerPath(channel: TvReceiverNewsChannel, news: unknown): string | null {
  if (channel === 'kuwait') return null; // Already priced by the visible exchange.
  if (channel === 'news') return GLOBAL_INDEX_TICKER;
  if (channel === 'technology') {
    const symbols = TECH_STOCKS.slice(0, 12).map(stock => stock.symbol);
    return '/api/tv/snapshot?group=us&market=US&pageSize=12&symbols=' + encodeURIComponent(JSON.stringify(symbols));
  }
  if (channel === 'metalsNews') {
    return '/api/tv/snapshot?group=commodities&pageSize=2';
  }
  if (channel in regionGroups) return '/api/tv/snapshot?pageSize=8&group=' + regionGroups[channel as keyof typeof regionGroups];
  if (channel in CATEGORY_TICKERS) return CATEGORY_TICKERS[channel as keyof typeof CATEGORY_TICKERS];
  const path = TV_NEWS_FEEDS[channel];
  const base = path + '&part=ticker';
  if (channel === 'fedNews' || channel === 'healthcareNews' || channel === 'newStocksNews') return base;
  const feed = record(news);
  if (feed.topic !== new URL(path, 'https://tv.invalid').searchParams.get('topic') || !Array.isArray(feed.items)) return null;
  const symbols = new Set<string>();
  for (const article of feed.items) {
    const row = record(article);
    for (const symbol of Array.isArray(row.symbols) ? row.symbols : [row.ticker]) {
      if (typeof symbol === 'string' && symbolPattern.test(symbol)) symbols.add(symbol);
    }
  }
  return symbols.size ? base + '&symbols=' + encodeURIComponent([...symbols].slice(0, 12).join(',')) : null;
}

const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n) ? n : null;

export function channelTickerQuotes(path: string | null, value: unknown): TvQuote[] {
  const body = record(value);
  if (!path || body.ok === false || body.success === false) return [];
  if (path.startsWith('/api/tv/snapshot?')) {
    const params = new URL(path, 'https://tv.invalid').searchParams;
    if (body.group !== params.get('group') || !Array.isArray(body.quotes)) return [];
    const snapshot = body as Partial<TvSnapshot>;
    const quotes = [...(snapshot.summary || []), ...(snapshot.quotes || [])];
    return params.get('group') === 'commodities' ? quotes.filter(q => ['COMEX:GC1!', 'COMEX:SI1!'].includes(q.symbol)) : quotes;
  }
  const topic = new URL(path, 'https://tv.invalid').searchParams.get('topic');
  if (topic && body.topic !== topic) return [];
  const rows = topic ? body.tickerItems : body.items;
  if (!Array.isArray(rows)) return [];
  const seen = new Set<string>();
  return rows.flatMap((raw): TvQuote[] => {
    const item = record(raw), price = finite(item.price);
    if (path === CATEGORY_TICKERS.shariaNews && (item.shariahStatus !== 'compliant' || item.assetType !== 'stock' || !item.canonicalSecurityId)) return [];
    if (item.available !== true || price === null || price <= 0 || typeof item.symbol !== 'string'
      || typeof item.source !== 'string' || !item.source.trim() || typeof item.currency !== 'string' || !item.currency.trim()) return [];
    const exchange = typeof item.exchange === 'string' ? item.exchange : null;
    const key = [item.symbol, exchange, item.currency].join(':');
    if (seen.has(key)) return [];
    seen.add(key);
    const name = typeof item.name === 'string' ? item.name : item.symbol;
    const observedAt = typeof item.asOf === 'string' && Number.isFinite(Date.parse(item.asOf)) ? item.asOf : null;
    return [{ symbol: item.symbol, name, nameAr: name, exchange, country: null, currency: item.currency,
      price, changePercent: finite(item.changePercent), source: item.source, observedAt, receivedAt: null,
      status: observedAt ? item.delayed === true ? 'delayed' : 'unknown_delay' : 'unknown_time' }];
  }).slice(0, 16);
}
