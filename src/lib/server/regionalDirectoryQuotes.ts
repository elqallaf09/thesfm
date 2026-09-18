import 'server-only';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
import { regionalQuoteIdentity } from '@/lib/market/regionalDirectory';

const cache = new Map<string, { quote: TechStockPrice; expires: number }>();
const pending = new Map<string, Promise<TechStockPrice>>();
let blockedUntil = 0;
let blockedReason = 'provider_rate_limited';
const accessBlockedUntil = new Map<string, number>();
let active = 0;
const waiting: Array<() => void> = [];

function unavailable(symbol: string, unavailableReason: string, asOf: string | null = null): TechStockPrice {
  return { symbol, price: null, change: null, changePercent: null, source: 'Twelve Data', delayed: true, available: false, unavailableReason, asOf };
}

async function acquire() {
  if (active < 3) { active++; return true; }
  if (waiting.length >= 48) return false;
  await new Promise<void>(resolve => waiting.push(resolve));
  return true;
}
function release() {
  const next = waiting.shift();
  if (next) next(); else active--;
}
function number(value: unknown) {
  if ((typeof value !== 'string' && typeof value !== 'number') || (typeof value === 'string' && !value.trim())) return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

async function load(symbol: string): Promise<TechStockPrice> {
  const identity = regionalQuoteIdentity(symbol);
  if (!identity) return unavailable(symbol, 'invalid_symbol');
  const key = process.env.TWELVE_DATA_API_KEY?.trim();
  if (!key) return unavailable(symbol, 'provider_not_configured');
  if (blockedUntil > Date.now()) return unavailable(symbol, blockedReason);
  if ((accessBlockedUntil.get(identity.mic) || 0) > Date.now()) return unavailable(symbol, 'provider_access_required');
  if (!await acquire()) return unavailable(symbol, 'provider_busy');
  try {
    if (blockedUntil > Date.now()) return unavailable(symbol, blockedReason);
    if ((accessBlockedUntil.get(identity.mic) || 0) > Date.now()) return unavailable(symbol, 'provider_access_required');
    const params = new URLSearchParams({ symbol: identity.symbol, mic_code: identity.mic, apikey: key });
    const response = await fetch(`https://api.twelvedata.com/quote?${params}`, { cache: 'no-store', signal: AbortSignal.timeout(6500) });
    const data = await response.json().catch(() => null) as Record<string, unknown> | null;
    const status = response.ok ? Number(data?.code || 200) : response.status;
    if (status === 429 || status === 401 || status === 403) {
      const reason = status === 429 ? 'provider_rate_limited' : 'provider_access_required';
      // Stop queued fanout after one provider quota/access failure.
      if (status === 429) { blockedReason = reason; blockedUntil = Date.now() + 60_000; }
      else accessBlockedUntil.set(identity.mic, Date.now() + 60_000);
      return unavailable(symbol, reason);
    }
    if (!response.ok || data?.status === 'error') return unavailable(symbol, 'provider_unavailable');
    if (!data || data.symbol !== identity.symbol || data.mic_code !== identity.mic || data.currency !== identity.currency) return unavailable(symbol, 'provider_identity_mismatch');
    const price = number(data.close), change = number(data.change), changePercent = number(data.percent_change);
    const timestamp = number(data.timestamp);
    if (price === null || price <= 0 || timestamp === null || timestamp <= 0 || timestamp * 1000 > Date.now() + 300_000 || (changePercent !== null && Math.abs(changePercent) >= 200)) return unavailable(symbol, 'provider_invalid_quote');
    const asOf = new Date(timestamp * 1000).toISOString();
    if (Date.now() - timestamp * 1000 > 7 * 86_400_000) return unavailable(symbol, 'provider_stale_quote', asOf);
    return { symbol, price, change, changePercent, source: 'Twelve Data', delayed: true, available: true, asOf };
  } catch {
    return unavailable(symbol, 'provider_unavailable');
  } finally { release(); }
}

export function getRegionalDirectoryQuote(symbol: string): Promise<TechStockPrice> {
  const current = cache.get(symbol);
  if (current && current.expires > Date.now()) return Promise.resolve(current.quote);
  const existing = pending.get(symbol);
  if (existing) return existing;
  const promise = load(symbol).then(quote => {
    if (cache.size >= 512) cache.delete(cache.keys().next().value!);
    cache.set(symbol, { quote, expires: Date.now() + (quote.available ? 300_000 : 60_000) });
    return quote;
  }).finally(() => pending.delete(symbol));
  pending.set(symbol, promise);
  return promise;
}
