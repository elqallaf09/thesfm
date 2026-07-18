export type FxRateResult = {
  from: string;
  to: string;
  rate: number | null;
  source: string | null;
  lastUpdated: string | null;
  available: boolean;
  stale?: boolean;
  error?: string;
};

const DEFAULT_EXCHANGE_URL = 'https://open.er-api.com/v6/latest/{BASE}';
const CACHE_TTL_MS = 5 * 60 * 1000;
const STALE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const fxCache = new Map<string, { expiresAt: number; staleUntil: number; result: FxRateResult }>();

export function __resetFxCacheForTests() {
  fxCache.clear();
}

function normalizeCurrency(value: unknown) {
  const code = String(value ?? '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

function numberOrNull(value: unknown) {
  const parsed = typeof value === 'string' ? Number(value.replace(/,/g, '')) : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function pick(payload: any, paths: string[]) {
  for (const path of paths) {
    const value = path.split('.').reduce((node, key) => node?.[key], payload);
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function providerUrl(base: string, target: string) {
  const configured = process.env.EXCHANGE_API_URL?.trim();
  const key = process.env.EXCHANGE_API_KEY?.trim();
  const template = configured || DEFAULT_EXCHANGE_URL;
  const withBase = template
    .replace('{BASE}', encodeURIComponent(base))
    .replace('{FROM}', encodeURIComponent(base))
    .replace('{TARGET_CURRENCY}', encodeURIComponent(target))
    .replace('{TO}', encodeURIComponent(target));
  return key ? withBase.replace('{EXCHANGE_API_KEY}', encodeURIComponent(key)) : withBase;
}

function providerHeaders(_url: string): HeadersInit {
  const key = process.env.EXCHANGE_API_KEY?.trim();
  const configured = process.env.EXCHANGE_API_URL?.trim();
  const headers: Record<string, string> = { accept: 'application/json' };
  if (key && configured) {
    headers.Authorization = `Bearer ${key}`;
    headers['x-api-key'] = key;
  }
  return headers;
}

async function fetchJson(url: string, headers: HeadersInit) {
  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(9000),
    headers,
  });
  if (!response.ok) throw new Error(`FX provider returned ${response.status}`);
  return response.json();
}

function parseRate(payload: any, target: string) {
  return numberOrNull(
    pick(payload, [
      `rates.${target}`,
      `conversion_rates.${target}`,
      `data.${target}`,
      target,
      'rate',
      'conversion_rate',
      'result',
    ]),
  );
}

function parseTimestamp(payload: any) {
  const raw = pick(payload, [
    'time_last_update_utc',
    'time_last_update_unix',
    'timestamp',
    'date',
    'lastUpdated',
    'updated_at',
  ]);
  if (typeof raw === 'number' && Number.isFinite(raw)) return new Date(raw * 1000).toISOString();
  const parsed = new Date(String(raw ?? ''));
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
}

function unavailable(from: string, to: string, error: string): FxRateResult {
  return { from, to, rate: null, source: null, lastUpdated: null, available: false, error };
}

export async function getFxRate(fromInput: unknown, toInput: unknown): Promise<FxRateResult> {
  const from = normalizeCurrency(fromInput);
  const to = normalizeCurrency(toInput);
  if (!from || !to) return unavailable(String(fromInput ?? ''), String(toInput ?? ''), 'INVALID_CURRENCY');
  if (from === to) {
    return {
      from,
      to,
      rate: 1,
      source: 'same_currency',
      lastUpdated: new Date().toISOString(),
      available: true,
      stale: false,
    };
  }

  const cacheKey = `${from}:${to}`;
  const cached = fxCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  try {
    const url = providerUrl(from, to);
    const payload = await fetchJson(url, providerHeaders(url));
    const rate = parseRate(payload, to);
    if (!rate) throw new Error(`FX rate ${from}/${to} unavailable`);
    const result: FxRateResult = {
      from,
      to,
      rate,
      source: process.env.EXCHANGE_API_URL?.trim() ? 'configured_exchange_api' : 'open.er-api.com',
      lastUpdated: parseTimestamp(payload),
      available: true,
      stale: false,
    };
    const cachedAt = Date.now();
    fxCache.set(cacheKey, { expiresAt: cachedAt + CACHE_TTL_MS, staleUntil: cachedAt + STALE_CACHE_TTL_MS, result });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'FX_PROVIDER_UNAVAILABLE';
    if (cached && cached.staleUntil > Date.now()) {
      return {
        ...cached.result,
        source: cached.result.source ? `stale_cache:${cached.result.source}` : 'stale_cache',
        available: true,
        stale: true,
        error: message,
      };
    }
    return unavailable(from, to, message);
  }
}

export async function getFxRates(pairs: Array<{ from: unknown; to: unknown }>) {
  return Promise.all(pairs.map(pair => getFxRate(pair.from, pair.to)));
}
