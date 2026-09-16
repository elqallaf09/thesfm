import type { MarketCurrencySource, MarketPriceUnit } from '@/lib/market/marketCurrency';
import type { ShariahScreeningData, ShariahStatus } from '@/lib/market/shariah-screening';
import cryptoSymbols from '@/data/market-symbols/crypto.json';
import { listCanonicalCryptoAssets, resolveCanonicalCryptoSymbol } from '@/lib/market/canonicalSymbols';

export type MarketAssetType = 'stock' | 'etf' | 'crypto' | 'forex' | 'commodity' | 'gold' | 'index';
export type MarketTrend = 'bullish' | 'neutral' | 'bearish';
export type MarketRiskLevel = 'low' | 'medium' | 'high';
export type MarketDataStatus = 'live' | 'delayed' | 'unavailable';
export type FundamentalsUnavailableReason = 'not_supported_for_asset_type' | 'provider_returned_empty' | 'symbol_not_supported' | 'api_error';
export type MarketAiInsight = {
  status: 'ready' | 'unavailable' | 'skipped';
  provider?: 'sfm-private-primary' | 'sfm-private-fallback' | 'openai' | 'anthropic' | 'rule-based';
  summary?: string;
  trendStatus?: string;
  riskNotes?: string;
  watchNext?: string[];
  error?: string;
};

export type MarketHistoryPoint = {
  date: string;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  /** Provider-supplied adjusted close when available. Consumers must not infer it. */
  adjustedClose?: number | null;
  volume?: number | null;
};

export type MarketAnalysis = {
  success: true;
  provider?: string;
  dataStatus?: MarketDataStatus;
  symbol: string;
  providerSymbol?: string;
  name: string;
  assetType: MarketAssetType;
  currency?: string | null;
  currencySource?: MarketCurrencySource;
  priceUnit?: MarketPriceUnit;
  exchange?: string;
  country?: string;
  market?: string;
  lastUpdated?: string;
  latestPrice: number;
  changePercent?: number;
  quote?: {
    price: number;
    change?: number;
    changePercent?: number;
    currency?: string | null;
    timestamp?: string;
  };
  fundamentals?: {
    marketCap?: number;
    peRatio?: number;
    eps?: number;
    revenue?: number;
    dividend?: number;
  };
  fundamentalsAvailable?: boolean;
  fundamentalsSource?: string;
  fundamentalsUnavailableReason?: FundamentalsUnavailableReason;
  technicals?: {
    source?: string;
    ohlc?: Array<{
      time?: string;
      open?: number;
      high?: number;
      low?: number;
      close?: number;
      volume?: number;
    }>;
  };
  trend: MarketTrend;
  riskLevel: MarketRiskLevel;
  indicators: {
    rsi: number;
    sma20: number;
    sma50: number;
    volatility: number;
  };
  levels: {
    support: number;
    resistance: number;
  };
  history: MarketHistoryPoint[];
  summary: string;
  fetchedAt?: string;
  warnings?: string[];
  marketDataService?: string;
  suggestions?: MarketSearchItem[];
};

export type MarketFailure = {
  success: false;
  provider?: string;
  dataStatus?: MarketDataStatus;
  symbol?: string;
  assetType?: MarketAssetType;
  currency?: string | null;
  latestPrice?: number | null;
  history?: MarketHistoryPoint[];
  message?: string;
  code?: string;
  suggestions?: MarketSearchItem[];
};

export type MarketResult = MarketAnalysis | MarketFailure;

export type MarketSearchItem = {
  symbol: string;
  providerSymbol?: string;
  name: string;
  assetType: MarketAssetType;
  exchange?: string;
  country?: string;
  currency?: string | null;
  aliases?: string[];
};

export type MarketSearchResponse = {
  ok: boolean;
  success: boolean;
  query: string;
  items: MarketSearchItem[];
};

export type MarketSymbolRecord = MarketSearchItem & {
  provider?: string;
};

export type MarketQuoteResult = {
  ok: boolean;
  success: boolean;
  provider?: string;
  dataStatus?: MarketDataStatus;
  source?: string;
  fallback?: boolean;
  symbol?: string;
  displaySymbol?: string;
  providerSymbol?: string;
  name?: string;
  assetType?: MarketAssetType;
  currency?: string | null;
  exchange?: string;
  country?: string;
  market?: string;
  lastUpdated?: string;
  latestPrice?: number | null;
  changePercent?: number | null;
  quote?: MarketAnalysis['quote'];
  fundamentals?: MarketAnalysis['fundamentals'];
  fundamentalsAvailable?: boolean;
  fundamentalsSource?: string;
  fundamentalsUnavailableReason?: FundamentalsUnavailableReason;
  technicals?: MarketAnalysis['technicals'];
  trend?: MarketTrend;
  riskLevel?: MarketRiskLevel;
  indicators?: MarketAnalysis['indicators'];
  levels?: MarketAnalysis['levels'];
  history?: MarketHistoryPoint[];
  summary?: string;
  fetchedAt?: string;
  warnings?: string[];
  marketDataService?: string;
  suggestions?: MarketSearchItem[];
  code?: string;
  message?: string;
};

export type MarketMover = {
  symbol: string;
  name?: string;
  price?: number | null;
  change?: number | null;
  changePercent?: number | null;
  currency?: string | null;
  assetType?: MarketAssetType;
  exchange?: string;
  country?: string;
  logo?: string;
};

export type MarketMoversResponse = {
  ok: boolean;
  success: boolean;
  provider?: string;
  dataStatus?: MarketDataStatus;
  source?: string;
  gainers: MarketMover[];
  losers: MarketMover[];
  updatedAt?: string;
  message?: string;
};

export type MarketTickerItem = MarketMover & {
  market?: string;
};

export type MarketTickerResponse = {
  ok: boolean;
  success: boolean;
  provider?: string;
  dataStatus?: MarketDataStatus;
  source?: string;
  items: MarketTickerItem[];
  updatedAt?: string;
  message?: string;
};

export type MarketShariahScreening = ShariahScreeningData & {
  status?: ShariahStatus;
};

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateSymbol(value: unknown): string | null {
  const symbol = clean(value).toUpperCase();
  if (!symbol || symbol.length > 40) return null;
  return /^[A-Z0-9.^=:_/-]+$/u.test(symbol) ? symbol : null;
}

export function normalizeMarketAssetType(value: unknown): MarketAssetType {
  const raw = clean(value).toLowerCase();
  if (raw === 'etf') return 'etf';
  if (raw === 'crypto' || raw === 'cryptocurrency') return 'crypto';
  if (raw === 'forex' || raw === 'fx') return 'forex';
  if (raw === 'commodity' || raw === 'commodities') return 'commodity';
  if (raw === 'gold' || raw === 'metal' || raw === 'metals') return 'gold';
  if (raw === 'index' || raw === 'indices') return 'index';
  return 'stock';
}

export function normalizeSearchText(value: unknown) {
  return clean(value).toLocaleLowerCase('en-US').replace(/\s+/g, ' ');
}

export function compactSearchText(value: unknown) {
  return normalizeSearchText(value).replace(/[^a-z0-9\p{L}]+/giu, '');
}

function searchScore(item: MarketSearchItem, query: string) {
  const normalized = normalizeSearchText(query);
  const compact = compactSearchText(query);
  const symbol = normalizeSearchText(item.symbol);
  const providerSymbol = normalizeSearchText(item.providerSymbol);
  const name = normalizeSearchText(item.name);
  const aliases = (item.aliases ?? []).map(alias => normalizeSearchText(alias));
  const fields = [symbol, providerSymbol, name, ...aliases].filter(Boolean);
  let score = 0;
  for (const field of fields) {
    const fieldCompact = compactSearchText(field);
    if (field === normalized) score = Math.max(score, 100);
    else if (fieldCompact && fieldCompact === compact) score = Math.max(score, 95);
    else if (field.startsWith(normalized)) score = Math.max(score, 80);
    else if (normalized && field.includes(normalized)) score = Math.max(score, 60);
    else if (compact && fieldCompact.includes(compact)) score = Math.max(score, 50);
  }
  return score;
}

export function rankMarketSearchItems(items: MarketSearchItem[], query: string) {
  return [...items]
    .map(item => ({ item, score: searchScore(item, query) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.symbol.localeCompare(b.item.symbol))
    .map(entry => entry.item);
}

export function canonicalCryptoSearchItems(): MarketSearchItem[] {
  return listCanonicalCryptoAssets().map(asset => ({
    symbol: asset.symbol,
    providerSymbol: asset.providerSymbol,
    name: asset.name,
    assetType: 'crypto',
    exchange: 'CRYPTO',
    country: 'GLOBAL',
    currency: 'USD',
    aliases: asset.aliases,
  }));
}

export function bundledCryptoSearchItems(): MarketSearchItem[] {
  const raw = Array.isArray(cryptoSymbols) ? cryptoSymbols : [];
  return raw.map(item => {
    const record = item as Record<string, unknown>;
    const symbol = validateSymbol(record.symbol) ?? clean(record.symbol).toUpperCase();
    const canonical = resolveCanonicalCryptoSymbol(symbol || clean(record.name));
    return {
      symbol: canonical?.symbol ?? symbol,
      providerSymbol: canonical?.providerSymbol ?? validateSymbol(record.providerSymbol) ?? symbol,
      name: clean(record.name) || canonical?.name || symbol,
      assetType: 'crypto' as const,
      exchange: clean(record.exchange) || 'CRYPTO',
      country: clean(record.country) || 'GLOBAL',
      currency: clean(record.currency) || 'USD',
      aliases: canonical?.aliases ?? [],
    };
  }).filter(item => Boolean(item.symbol));
}

export function mergeMarketSearchItems(...groups: MarketSearchItem[][]) {
  const seen = new Set<string>();
  const result: MarketSearchItem[] = [];
  for (const group of groups) {
    for (const item of group) {
      const symbol = validateSymbol(item.symbol);
      if (!symbol) continue;
      const key = `${symbol}:${item.assetType}:${item.exchange ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ ...item, symbol });
    }
  }
  return result;
}
