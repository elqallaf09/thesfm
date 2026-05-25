import {
  normalizeAssetType,
  validateSymbol,
  type MarketAnalysis,
  type MarketAssetType,
  type MarketResult,
} from '@/lib/market/marketService';
import symbolDirectory from '../../../openbb-service/data/symbols.json';

const OPENBB_TIMEOUT_MS = 12000;

type ProxyState = 'connected' | 'not_configured' | 'unavailable';

export function getOpenBBServiceUrl() {
  return process.env.OPENBB_SERVICE_URL?.trim().replace(/\/+$/, '') || '';
}

export function marketServiceNotConfigured() {
  return {
    ok: false,
    marketService: 'openbb',
    openbbService: 'not_configured' as ProxyState,
    serviceUrlConfigured: false,
    message: 'OPENBB_SERVICE_URL is missing',
  };
}

export function marketServiceUnavailable() {
  return {
    ok: false,
    marketService: 'openbb',
    openbbService: 'unavailable' as ProxyState,
    serviceUrlConfigured: true,
  };
}

export function marketServiceConnected() {
  return {
    ok: true,
    marketService: 'openbb',
    openbbService: 'connected' as ProxyState,
    serviceUrlConfigured: true,
  };
}

async function fetchWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENBB_TIMEOUT_MS);
  try {
    return await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOpenBB(path: string, params?: URLSearchParams) {
  const baseUrl = getOpenBBServiceUrl();
  if (!baseUrl) return { configured: false as const };

  const url = new URL(`${baseUrl}${path}`);
  params?.forEach((value, key) => url.searchParams.set(key, value));

  try {
    const response = await fetchWithTimeout(url.toString());
    if (!response.ok) return { configured: true as const, available: false as const };
    const data = await response.json();
    return { configured: true as const, available: true as const, data };
  } catch {
    return { configured: true as const, available: false as const };
  }
}

function scoreDirectoryItem(item: Record<string, any>, query: string) {
  const needle = query.toLowerCase();
  const symbol = String(item.symbol ?? '').toLowerCase();
  const providerSymbol = String(item.providerSymbol ?? '').toLowerCase();
  const name = String(item.name ?? '').toLowerCase();
  const assetType = String(item.assetType ?? '').toLowerCase();
  if (!needle) return 1;
  if (symbol === needle || providerSymbol === needle) return 100;
  if (symbol.startsWith(needle)) return 88;
  if (name.startsWith(needle)) return 78;
  if (symbol.includes(needle) || providerSymbol.includes(needle)) return 62;
  if (name.includes(needle)) return 50;
  if (assetType.includes(needle)) return 35;
  return 0;
}

function defaultCurrency(assetType: MarketAssetType, symbol: string) {
  if (assetType === 'forex' && symbol.length >= 6) return symbol.slice(-3);
  return 'USD';
}

function searchLocalSymbolDirectory(query: string, assetType?: MarketAssetType) {
  return (symbolDirectory as Array<Record<string, any>>)
    .filter(item => !assetType || normalizeAssetType(item.assetType) === assetType)
    .map(item => ({ score: scoreDirectoryItem(item, query), item }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || String(a.item.symbol).localeCompare(String(b.item.symbol)))
    .slice(0, 12)
    .map(({ item }) => ({
      symbol: String(item.symbol ?? '').toUpperCase(),
      name: String(item.name ?? item.symbol ?? ''),
      assetType: normalizeAssetType(item.assetType),
      exchange: item.exchange ? String(item.exchange) : undefined,
      country: item.country ? String(item.country) : undefined,
      currency: item.currency ? String(item.currency) : defaultCurrency(normalizeAssetType(item.assetType), String(item.symbol ?? '').toUpperCase()),
      providerSymbol: item.providerSymbol ? String(item.providerSymbol).toUpperCase() : String(item.symbol ?? '').toUpperCase(),
    }));
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return 0;
  const avg = average(values);
  const variance = average(values.map(value => (value - avg) ** 2));
  return Math.sqrt(variance);
}

function calculateRsi(closes: number[]) {
  if (closes.length < 2) return 50;
  const changes = closes.slice(1).map((close, index) => close - closes[index]);
  const gains = changes.filter(change => change > 0);
  const losses = changes.filter(change => change < 0).map(Math.abs);
  const avgGain = average(gains);
  const avgLoss = average(losses);
  if (avgLoss === 0) return avgGain > 0 ? 100 : 50;
  const rs = avgGain / avgLoss;
  return Math.max(0, Math.min(100, 100 - (100 / (1 + rs))));
}

function enrichAnalysis(raw: unknown, symbol: string, assetType: MarketAssetType): MarketAnalysis | null {
  const data = raw && typeof raw === 'object' ? raw as Record<string, any> : {};
  const history = Array.isArray(data.history) ? data.history : [];
  const closes = history
    .map(point => Number(point?.close))
    .filter(value => Number.isFinite(value));
  const latestPrice = Number(data.latestPrice ?? closes.at(-1) ?? 0);
  if (!Number.isFinite(latestPrice) || latestPrice <= 0 || closes.length === 0) return null;

  const firstClose = closes[0] || latestPrice;
  const derivedChange = firstClose ? ((latestPrice - firstClose) / firstClose) * 100 : 0;
  const changePercent = Number.isFinite(Number(data.changePercent)) ? Number(data.changePercent) : derivedChange;
  const volatility = Number.isFinite(Number(data.indicators?.volatility))
    ? Number(data.indicators.volatility)
    : latestPrice ? (standardDeviation(closes) / latestPrice) * 100 : 0;
  const trend = ['bullish', 'neutral', 'bearish'].includes(String(data.trend))
    ? data.trend
    : changePercent > 0.5 ? 'bullish' : changePercent < -0.5 ? 'bearish' : 'neutral';
  const riskLevel = ['low', 'medium', 'high'].includes(String(data.riskLevel))
    ? data.riskLevel
    : volatility >= 30 ? 'high' : volatility >= 12 ? 'medium' : 'low';

  return {
    success: true,
    source: 'openbb',
    fallback: false,
    symbol: String(data.symbol ?? symbol).toUpperCase(),
    providerSymbol: data.providerSymbol ? String(data.providerSymbol) : undefined,
    name: String(data.name ?? `${symbol} Market Asset`),
    assetType,
    latestPrice,
    changePercent,
    trend,
    riskLevel,
    indicators: {
      rsi: Number.isFinite(Number(data.indicators?.rsi)) ? Number(data.indicators.rsi) : Number(calculateRsi(closes).toFixed(1)),
      sma20: Number.isFinite(Number(data.indicators?.sma20)) ? Number(data.indicators.sma20) : Number(average(closes.slice(-20)).toFixed(2)),
      sma50: Number.isFinite(Number(data.indicators?.sma50)) ? Number(data.indicators.sma50) : Number(average(closes.slice(-50)).toFixed(2)),
      volatility: Number(volatility.toFixed(1)),
    },
    levels: {
      support: Math.min(...closes),
      resistance: Math.max(...closes),
    },
    history: history.length ? history.map((point: any) => ({
      date: String(point.date ?? ''),
      close: Number(point.close ?? 0),
    })).filter(point => point.date && Number.isFinite(point.close)) : [],
    summary: String(data.summary ?? 'Market data loaded from the configured provider. Review the source before making decisions.'),
    fallbackReason: data.fallbackReason ? String(data.fallbackReason) : undefined,
  };
}

export async function proxyHealth() {
  const result = await fetchOpenBB('/health');
  if (!result.configured) return marketServiceNotConfigured();
  if (!result.available) return marketServiceUnavailable();
  return marketServiceConnected();
}

export async function proxyAnalyze(
  symbolInput: unknown,
  assetTypeInput: unknown,
  metaInput?: { displaySymbol?: unknown; name?: unknown },
): Promise<MarketResult & { displaySymbol?: string; source?: string; fallback?: boolean; openbbService?: ProxyState }> {
  const providerSymbol = validateSymbol(symbolInput);
  if (!providerSymbol) return { success: false, error: 'Invalid symbol' };

  const assetType = normalizeAssetType(assetTypeInput);
  const displaySymbol = validateSymbol(metaInput?.displaySymbol) ?? providerSymbol;
  const friendlyName = typeof metaInput?.name === 'string' ? metaInput.name.trim().slice(0, 120) : '';
  const params = new URLSearchParams({ symbol: providerSymbol, assetType });
  const result = await fetchOpenBB('/market/analyze', params);

  if (result.configured && result.available && result.data?.success) {
    const enriched = enrichAnalysis(result.data, displaySymbol, assetType);
    if (!enriched) {
      return {
        success: false,
        error: 'Real market provider did not return enough data for this asset.',
        source: 'openbb',
        fallback: false,
        openbbService: 'connected',
      };
    }
    return {
      ...enriched,
      symbol: displaySymbol,
      displaySymbol,
      providerSymbol: enriched.providerSymbol ?? providerSymbol,
      name: friendlyName || enriched.name,
    };
  }

  return {
    success: false,
    error: result.configured ? 'Market data provider is unavailable.' : 'Market data provider is not configured.',
    source: 'openbb',
    fallback: false,
    openbbService: result.configured ? 'unavailable' : 'not_configured',
  };
}

export async function proxyHistory(symbolInput: unknown, assetTypeInput: unknown, periodInput: unknown) {
  const symbol = validateSymbol(symbolInput);
  if (!symbol) return { success: false, error: 'Invalid symbol' };

  const assetType = normalizeAssetType(assetTypeInput);
  const period = String(periodInput ?? '6m');
  const result = await fetchOpenBB('/market/history', new URLSearchParams({ symbol, assetType, period }));
  if (result.configured && result.available && result.data?.success) return result.data;

  return {
    success: false,
    source: 'openbb',
    fallback: false,
    openbbService: result.configured ? 'unavailable' : 'not_configured',
    symbol,
    assetType,
    period,
    history: [],
    error: result.configured ? 'Market data provider is unavailable.' : 'Market data provider is not configured.',
  };
}

export async function proxyCompare(symbolsInput: unknown, assetTypeInput: unknown) {
  const assetType = normalizeAssetType(assetTypeInput);
  const symbols = String(symbolsInput ?? '')
    .split(',')
    .map(validateSymbol)
    .filter((symbol): symbol is string => Boolean(symbol))
    .slice(0, 8);

  const result = await fetchOpenBB('/market/compare', new URLSearchParams({ symbols: symbols.join(','), assetType }));
  if (result.configured && result.available && result.data?.success) {
    const results = Array.isArray(result.data.results)
      ? result.data.results.map((item: unknown, index: number) => enrichAnalysis(item, symbols[index] ?? 'AAPL', assetType)).filter(Boolean)
      : [];
    return { success: true, source: 'openbb', results };
  }

  return {
    success: true,
    source: 'openbb',
    fallback: false,
    openbbService: result.configured ? 'unavailable' : 'not_configured',
    results: [],
  };
}

export async function proxySearch(queryInput: unknown, assetTypeInput: unknown) {
  const query = String(queryInput ?? '').trim();
  const assetType = assetTypeInput ? normalizeAssetType(assetTypeInput) : undefined;
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (assetType) params.set('assetType', assetType);

  const result = await fetchOpenBB('/market/search', params);
  if (result.configured && result.available && result.data?.success) return result.data;

  const directoryResults = searchLocalSymbolDirectory(query, assetType);
  if (directoryResults.length > 0) {
    return {
      success: true,
      query,
      source: 'cache',
      fallback: false,
      openbbService: result.configured ? 'unavailable' : 'not_configured',
      results: directoryResults,
    };
  }

  return {
    success: true,
    query,
    source: 'cache',
    fallback: false,
    openbbService: result.configured ? 'unavailable' : 'not_configured',
    results: [],
  };
}
