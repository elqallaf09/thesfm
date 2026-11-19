import 'server-only';
import { unstable_cache } from 'next/cache';
import type { TvQuote } from '@/lib/markets-tv/types';
import type { TvAsset } from './catalog';

// Frankfurter's blended daily reference feed permits commercial use and caching.
// It is an indicative reference, never a live quote or a CBK official rate.
// https://frankfurter.dev/#faq
const REFERENCE_URL = 'https://api.frankfurter.dev/v2/rates?base=USD';
const CACHE_MS = 60 * 60_000;
const FAILURE_BACKOFF_MS = 60_000;
const MAX_AGE_MS = 7 * 86_400_000;
type ReferencePoint = { date: string; rate: number };
export type ForexReferenceTable = Record<string, ReferencePoint>;

export function isCurrentReferenceDate(value: unknown, now = Date.now()): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
    && timestamp <= now && now - timestamp <= MAX_AGE_MS;
}

export function parseForexReferenceTable(payload: unknown, now = Date.now()): ForexReferenceTable {
  if (!Array.isArray(payload)) throw new Error('INVALID_FOREX_REFERENCE');
  const table: ForexReferenceTable = {};
  const conflicting = new Set<string>();
  for (const item of payload) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    if (row.base !== 'USD' || typeof row.quote !== 'string' || !/^[A-Z]{3}$/.test(row.quote)
      || !isCurrentReferenceDate(row.date, now) || typeof row.rate !== 'number'
      || !Number.isFinite(row.rate) || row.rate <= 0 || row.quote === 'USD' && row.rate !== 1) continue;
    const existing = table[row.quote];
    if (existing && (existing.date !== row.date || existing.rate !== row.rate)) conflicting.add(row.quote);
    table[row.quote] = { date: row.date, rate: row.rate };
  }
  for (const currency of conflicting) delete table[currency];
  if (Object.keys(table).length < 2) throw new Error('EMPTY_FOREX_REFERENCE');
  return table;
}

export function forexReferenceQuote(asset: TvAsset, table: ForexReferenceTable, now = Date.now()): TvQuote | null {
  if (!/^[A-Z]{3}\/[A-Z]{3}$/.test(asset.symbol)) return null;
  const [base, currency] = asset.symbol.split('/');
  if (base === currency || asset.currency && asset.currency !== currency
    || asset.baseCurrency && asset.baseCurrency !== base) return null;
  const from = table[base], to = table[currency];
  // Never combine observations from different days or stamp old rates as fresh.
  if (!from || !to || from.date !== to.date || !isCurrentReferenceDate(from.date, now)
    || !Number.isFinite(from.rate) || from.rate <= 0 || !Number.isFinite(to.rate) || to.rate <= 0) return null;
  const price = to.rate / from.rate;
  if (!Number.isFinite(price) || price <= 0) return null;
  return {
    symbol: asset.symbol, name: asset.name, nameAr: asset.nameAr || asset.name,
    price, currency, changePercent: null, source: 'Frankfurter · reference',
    observedAt: from.date, receivedAt: new Date(now).toISOString(),
    exchange: asset.region || 'FOREX', country: null, status: 'reference',
    observation: { precision: 'date', marketOpen: null }, delayType: 'eod', changeBasis: 'reference',
  };
}

const loadReferenceTable = unstable_cache(async () => {
  const response = await fetch(REFERENCE_URL, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('FOREX_REFERENCE_UNAVAILABLE');
  return parseForexReferenceTable(await response.json());
}, ['tv-forex-reference-v1'], { revalidate: CACHE_MS / 1000 });

let cached: { table: ForexReferenceTable; expiresAt: number } | null = null;
let pending: Promise<ForexReferenceTable | null> | null = null;
let failedUntil = 0;
async function sharedReferenceTable(): Promise<ForexReferenceTable | null> {
  const now = Date.now();
  // Also cache in-process: Next bypasses an inner unstable_cache while loading
  // the per-listing quote cache. One FX table must still serve every pair.
  if (cached && cached.expiresAt > now) return cached.table;
  if (failedUntil > now) return cached?.table ?? null;
  if (!pending) {
    pending = loadReferenceTable().then(table => {
      cached = { table, expiresAt: Date.now() + CACHE_MS };
      failedUntil = 0;
      return table;
    }).catch(() => {
      failedUntil = Date.now() + FAILURE_BACKOFF_MS;
      return cached?.table ?? null;
    }).finally(() => { pending = null; });
  }
  return pending;
}

export async function dailyForexReference(asset: TvAsset): Promise<TvQuote | null> {
  const table = await sharedReferenceTable();
  return table ? forexReferenceQuote(asset, table) : null;
}

export function __resetForexReferenceForTests() {
  cached = null;
  pending = null;
  failedUntil = 0;
}
