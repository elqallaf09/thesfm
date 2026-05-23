import {
  compareMarketAssets,
  fetchMarketAnalysis,
  getFallbackMockData,
  searchMarketAssets,
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

function enrichAnalysis(raw: unknown, symbol: string, assetType: MarketAssetType, fallback = false): MarketAnalysis {
  const data = raw && typeof raw === 'object' ? raw as Record<string, any> : {};
  const history = Array.isArray(data.history) ? data.history : [];
  const closes = history
    .map(point => Number(point?.close))
    .filter(value => Number.isFinite(value));
  const latestPrice = Number(data.latestPrice ?? closes.at(-1) ?? 0);
  const support = closes.length ? Math.min(...closes) : latestPrice * 0.95;
  const resistance = closes.length ? Math.max(...closes) : latestPrice * 1.05;
  const mockFallback = getFallbackMockData(symbol, assetType);

  return {
    ...mockFallback,
    success: true,
    source: String(data.source ?? (fallback ? 'mock' : 'openbb')),
    fallback: Boolean(data.fallback ?? fallback),
    symbol: String(data.symbol ?? symbol).toUpperCase(),
    providerSymbol: data.providerSymbol ? String(data.providerSymbol) : undefined,
    name: String(data.name ?? `${symbol} Market Asset`),
    assetType,
    latestPrice: Number.isFinite(latestPrice) ? latestPrice : mockFallback.latestPrice,
    changePercent: Number(data.changePercent ?? mockFallback.changePercent),
    trend: ['bullish', 'neutral', 'bearish'].includes(String(data.trend)) ? data.trend : mockFallback.trend,
    riskLevel: ['low', 'medium', 'high'].includes(String(data.riskLevel)) ? data.riskLevel : mockFallback.riskLevel,
    indicators: {
      rsi: Number(data.indicators?.rsi ?? mockFallback.indicators.rsi),
      sma20: Number(data.indicators?.sma20 ?? mockFallback.indicators.sma20),
      sma50: Number(data.indicators?.sma50 ?? mockFallback.indicators.sma50),
      volatility: Number(data.indicators?.volatility ?? mockFallback.indicators.volatility),
    },
    levels: {
      support: Number.isFinite(support) ? support : mockFallback.levels.support,
      resistance: Number.isFinite(resistance) ? resistance : mockFallback.levels.resistance,
    },
    history: history.length ? history.map((point: any) => ({
      date: String(point.date ?? ''),
      close: Number(point.close ?? 0),
    })).filter(point => point.date && Number.isFinite(point.close)) : mockFallback.history,
    summary: String(data.summary ?? mockFallback.summary),
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
    return {
      ...enriched,
      symbol: displaySymbol,
      displaySymbol,
      providerSymbol: enriched.providerSymbol ?? providerSymbol,
      name: friendlyName || enriched.name,
    };
  }

  const fallback = await fetchMarketAnalysis({ symbol: displaySymbol, assetType });
  if (!fallback.success) return fallback;
  return {
    ...fallback,
    symbol: displaySymbol,
    displaySymbol,
    providerSymbol,
    name: friendlyName || fallback.name,
    source: 'mock',
    fallback: true,
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

  const fallback = getFallbackMockData(symbol, assetType);
  return {
    success: true,
    source: 'mock',
    fallback: true,
    openbbService: result.configured ? 'unavailable' : 'not_configured',
    symbol,
    assetType,
    period,
    history: fallback.history,
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
      ? result.data.results.map((item: unknown, index: number) => enrichAnalysis(item, symbols[index] ?? 'AAPL', assetType))
      : [];
    return { success: true, source: 'openbb', results };
  }

  const results = await compareMarketAssets(symbols.join(','), assetType);
  return {
    success: true,
    source: 'mock',
    fallback: true,
    openbbService: result.configured ? 'unavailable' : 'not_configured',
    results,
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
      fallback: true,
      openbbService: result.configured ? 'unavailable' : 'not_configured',
      results: directoryResults,
    };
  }

  const results = await searchMarketAssets({ query, assetType });
  return {
    success: true,
    query,
    source: 'fallback',
    fallback: true,
    openbbService: result.configured ? 'unavailable' : 'not_configured',
    results,
  };
}
