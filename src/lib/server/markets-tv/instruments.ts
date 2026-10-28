import 'server-only';
import { unstable_cache } from 'next/cache';
import { SaxesParser } from 'saxes';
import type { TvAsset } from './catalog';
import type { TvQuote } from '@/lib/markets-tv/types';
import { twelveDataObservation } from '@/lib/market/quoteObservation';
import { quoteStatus } from '@/lib/markets-tv/quotes';
import { twelveDataFetch, TWELVE_RETRY_HEADER } from '@/lib/server/twelve-data-fetch';

const BINANCE = 'https://data-api.binance.vision/api/v3';
const ECB = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml';
type Row = Record<string, unknown>;
const numeric = (value: unknown) => (typeof value === 'number' || typeof value === 'string' && value.trim()) && Number.isFinite(Number(value)) ? Number(value) : null;
export function parseCryptoDirectory(payload: unknown): TvAsset[] {
  const symbols = (payload as { symbols?: Row[] })?.symbols;
  if (!Array.isArray(symbols)) throw new Error('INVALID_DIRECTORY');
  const rows = new Map<string, TvAsset>();
  for (const row of symbols) {
    if (row.status !== 'TRADING' || row.isSpotTradingAllowed !== true || ![row.baseAsset, row.quoteAsset, row.symbol].every(x => typeof x === 'string' && /^[A-Z0-9]{1,24}$/.test(x))) continue;
    if (row.symbol !== `${row.baseAsset}${row.quoteAsset}`) continue;
    const symbol = `${row.baseAsset}/${row.quoteAsset}`;
    rows.set(symbol, { symbol, name: symbol, region: 'BINANCE', currency: String(row.quoteAsset), baseCurrency: String(row.baseAsset), providerSymbol: String(row.symbol) });
  }
  const priority = ['BTC/USDT','ETH/USDT','SOL/USDT','BNB/USDT','XRP/USDT'];
  return [...rows.values()].sort((a,b) => {
    const rank = (s: string) => priority.includes(s) ? priority.indexOf(s) : s.endsWith('/USDT') ? 10 : 20;
    return rank(a.symbol) - rank(b.symbol) || a.symbol.localeCompare(b.symbol);
  });
}
export function parseForexDirectory(payload: unknown): TvAsset[] {
  const data = (payload as { data?: Row[]; status?: string })?.data;
  if (!Array.isArray(data)) throw new Error('INVALID_DIRECTORY');
  const rows = new Map<string, TvAsset>();
  for (const row of data) {
    if (typeof row.symbol !== 'string' || !/^[A-Z]{3}\/[A-Z]{3}$/.test(row.symbol)) continue;
    const [base, currency] = row.symbol.split('/');
    if (base === currency) continue;
    rows.set(row.symbol, { symbol: row.symbol, name: `${row.currency_base || base} / ${row.currency_quote || currency}`, currency, baseCurrency: base, region: 'FOREX' });
  }
  const majors = ['EUR/USD','GBP/USD','USD/JPY','USD/CHF','AUD/USD','USD/CAD','NZD/USD'];
  return [...rows.values()].sort((a,b) => (majors.includes(a.symbol) ? majors.indexOf(a.symbol) : 99) - (majors.includes(b.symbol) ? majors.indexOf(b.symbol) : 99) || a.symbol.localeCompare(b.symbol));
}
const loadInstruments = unstable_cache(async (group: 'crypto' | 'forex') => {
  const response = await fetch(group === 'crypto' ? `${BINANCE}/exchangeInfo` : 'https://api.twelvedata.com/forex_pairs', { cache: 'no-store', signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error('DIRECTORY_UNAVAILABLE');
  const data = await response.json();
  const rows = group === 'crypto' ? parseCryptoDirectory(data) : parseForexDirectory(data);
  if (!rows.length) throw new Error('EMPTY_DIRECTORY');
  return rows;
}, ['tv-instrument-directory-v1'], { revalidate: 3600 });
export async function tvInstrumentAssets(group: 'crypto' | 'forex') { return loadInstruments(group); }

export function emptyInstrument(asset: TvAsset, issue: TvQuote['issue'] = 'provider_unavailable'): TvQuote {
  return { symbol: asset.symbol, name: asset.name, nameAr: asset.nameAr || asset.name, price: null, currency: asset.currency || null, changePercent: null, source: null, observedAt: null, receivedAt: null, status: 'unavailable', exchange: asset.region || null, country: null, issue };
}
export function parseCryptoQuotes(payload: unknown, assets: TvAsset[], now = Date.now()): TvQuote[] {
  const rows = new Map((Array.isArray(payload) ? payload : []).map((row: Row) => [row.symbol, row]));
  return assets.map(asset => {
    const quote = emptyInstrument(asset), row = rows.get(asset.providerSymbol);
    const price = numeric(row?.lastPrice), timestamp = numeric(row?.closeTime), trades = numeric(row?.count);
    if (!row || price === null || price <= 0 || timestamp === null || timestamp <= 0 || timestamp > now + 60000 || trades === null || trades <= 0) return { ...quote, issue: 'invalid_quote' };
    return { ...quote, issue: undefined, price, changePercent: numeric(row.priceChangePercent), observedAt: new Date(timestamp).toISOString(), receivedAt: new Date(now).toISOString(),
      observation: { precision: 'instant', marketOpen: null }, delayType: 'realtime', changeBasis: '24h', source: 'Binance Spot · 24h', status: now - timestamp > 900000 ? 'stale' as const : 'available' as const };
  });
}
export async function cryptoTvQuotes(assets: TvAsset[]): Promise<TvQuote[]> {
  if (!assets.length) return [];
  try {
    const symbols = JSON.stringify([...new Set(assets.map(a => a.providerSymbol))]);
    const response = await fetch(`${BINANCE}/ticker/24hr?${new URLSearchParams({ symbols })}`, { next: { revalidate: 10 }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) return assets.map(asset => emptyInstrument(asset, response.status === 429 ? 'rate_limited' : [401, 403].includes(response.status) ? 'access_denied' : 'provider_unavailable'));
    return parseCryptoQuotes(await response.json(), assets);
  } catch (error) { return assets.map(asset => emptyInstrument(asset, error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name) ? 'timeout' : 'provider_unavailable')); }
}

type ReferenceDay = { date: string; rates: Record<string, number> };
export function parseEcbRates(xml: string): ReferenceDay[] {
  const days: ReferenceDay[] = []; let day: ReferenceDay | null = null;
  const parser = new SaxesParser({ xmlns: false });
  parser.on('opentag', node => {
    if (node.name !== 'Cube') return;
    const { time, currency, rate } = node.attributes;
    if (typeof time === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(time)) { day = { date: time, rates: { EUR: 1 } }; days.push(day); }
    if (day && typeof currency === 'string' && /^[A-Z]{3}$/.test(currency) && numeric(rate) !== null && Number(rate) > 0) day.rates[currency] = Number(rate);
  });
  parser.write(xml).close();
  return days.sort((a,b) => b.date.localeCompare(a.date));
}
const referenceRates = unstable_cache(async () => {
  const response = await fetch(ECB, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('REFERENCE_UNAVAILABLE');
  const days = parseEcbRates(await response.text());
  if (!days.length) throw new Error('REFERENCE_UNAVAILABLE');
  return days.slice(0, 2);
}, ['tv-ecb-reference-v1'], { revalidate: 3600 });
let pendingReference: Promise<ReferenceDay[]> | null = null;
function sharedReference() {
  if (!pendingReference) pendingReference = referenceRates().finally(() => { pendingReference = null; });
  return pendingReference;
}
export function referenceForexQuote(asset: TvAsset, days: ReferenceDay[]): TvQuote {
  const [base, currency] = asset.symbol.split('/'), [latest, previous] = days;
  const ratio = (day?: ReferenceDay) => day?.rates[base] && day?.rates[currency] ? day.rates[currency] / day.rates[base] : null;
  const price = ratio(latest), before = ratio(previous), quote = emptyInstrument(asset);
  if (price === null || !latest || Date.parse(latest.date) > Date.now()) return quote;
  return { ...quote, issue: undefined, price, changePercent: before ? (price / before - 1) * 100 : null, source: 'ECB · reference', observedAt: latest.date, receivedAt: new Date().toISOString(),
    observation: { precision: 'date', marketOpen: null }, delayType: 'eod', changeBasis: 'reference', status: 'reference' };
}
export async function forexTvQuote(asset: TvAsset): Promise<TvQuote> {
  const key = process.env.TWELVE_DATA_API_KEY?.trim();
  let issue: TvQuote['issue'] = key ? 'provider_unavailable' : 'not_configured';
  let retryAt: string | null = null;
  if (key) {
    try {
      const params = new URLSearchParams({ symbol: asset.symbol, apikey: key, timezone: 'UTC' });
      const response = await twelveDataFetch(`https://api.twelvedata.com/quote?${params}`, { signal: AbortSignal.timeout(4000) });
      retryAt = response.headers.get(TWELVE_RETRY_HEADER);
      const payload: unknown = await response.json().catch(() => null);
      const row = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload as Row : {};
      const price = numeric(row.close), { lastUpdated: time, observation, delayType } = twelveDataObservation(row);
      const code = [401, 403, 429].find(value => Number(row.code) === value || response.status === value);
      if (code) issue = code === 429 ? 'rate_limited' : 'access_denied';
      if (response.ok && row.status !== 'error' && row.symbol === asset.symbol && (!row.currency || row.currency === asset.currency) && price !== null && price > 0 && time && Date.parse(time) <= Date.now() + 60000) {
        const quote: TvQuote = { ...emptyInstrument(asset), issue: undefined, price, changePercent: numeric(row.percent_change), source: 'Twelve Data', observedAt: time,
          receivedAt: new Date().toISOString(), observation, delayType, changeBasis: 'session', status: delayType === 'eod' ? 'closed' : 'delayed' };
        quote.status = quoteStatus(quote); return quote;
      }
      if (response.ok && row.status !== 'error') issue = row.symbol && row.symbol !== asset.symbol || row.currency && row.currency !== asset.currency ? 'identity_mismatch' : 'invalid_quote';
    } catch (error) { issue = error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name) ? 'timeout' : 'provider_unavailable'; }
  }
  try { const quote = referenceForexQuote(asset, await sharedReference()); return quote.price === null ? { ...quote, issue, retryAt } : quote; }
  catch { return { ...emptyInstrument(asset, issue), retryAt }; }
}
