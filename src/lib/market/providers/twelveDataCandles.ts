import type { NormalizedMarketCandle } from '@/lib/market/marketDataProviders';

type Candidate = { symbol: string; exchange: string | null };
type Result = { ok: boolean; status: number; data: unknown };
type FetchJson = (url: string, options: { cacheKey: string; ttlMs: number; forceFresh?: boolean }) => Promise<Result>;

function positive(value: unknown) {
  if (value === null || value === '' || typeof value === 'boolean') return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

export async function fetchTwelveDataCandles(options: {
  candidates: Candidate[]; key: string; interval: string; forceFresh?: boolean;
  fetchJson: FetchJson; onFailure: (candidate: Candidate, result: Result) => void;
}): Promise<NormalizedMarketCandle[]> {
  const seen = new Set<string>();
  for (const candidate of options.candidates) {
    const identity = `${candidate.symbol}:${candidate.exchange ?? ''}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    const interval = !options.interval || /^(1d|d)$/i.test(options.interval) ? '1day' : options.interval;
    const params = new URLSearchParams({ symbol: candidate.symbol, interval, outputsize: '260', apikey: options.key, timezone: 'UTC' });
    if (candidate.exchange) params.set('exchange', candidate.exchange);
    const result = await options.fetchJson(`https://api.twelvedata.com/time_series?${params}`, {
      cacheKey: `candles:twelve_data:${identity}:${interval}`, ttlMs: 300_000, forceFresh: options.forceFresh,
    });
    const body = result.data as { status?: string; code?: number; values?: Record<string, unknown>[]; meta?: { symbol?: string; currency?: string } } | null;
    if (!result.ok || body?.status === 'error' || !Array.isArray(body?.values)) {
      const status = body?.status === 'error' && Number(body.code) >= 400 ? Number(body.code) : result.status;
      options.onFailure(candidate, { ...result, status });
      // Another identity cannot fix authorization, quotas or an upstream outage.
      if ([401, 402, 403, 429].includes(status) || status >= 500) break;
      continue;
    }
    const compact = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^GOLD$/, 'XAUUSD');
    if (body.meta?.symbol && compact(body.meta.symbol) !== compact(candidate.symbol)) continue;
    if (candidate.symbol === 'XAG/USD' && body.meta?.currency && body.meta.currency !== 'USD') continue;
    const candles = new Map<string, NormalizedMarketCandle>();
    for (const row of body.values) {
      const date = typeof row.datetime === 'string' ? row.datetime : '';
      const time = Date.parse(date), close = positive(row.close);
      if (!date || !Number.isFinite(time) || time > Date.now() + 60_000 || close === undefined) continue;
      if (date.length === 10 && new Date(time).toISOString().slice(0, 10) !== date) continue;
      const open = positive(row.open), high = positive(row.high), low = positive(row.low);
      if (high !== undefined && (high < close || (open !== undefined && high < open))) continue;
      if (low !== undefined && (low > close || (open !== undefined && low > open))) continue;
      const volume = row.volume === null || row.volume === undefined || row.volume === '' || typeof row.volume === 'boolean' ? null : Number(row.volume);
      candles.set(date, { date, close, open, high, low, volume: volume !== null && Number.isFinite(volume) && volume >= 0 ? volume : null, provider: 'twelve_data' });
    }
    if (candles.size) return [...candles.values()].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  }
  return [];
}
