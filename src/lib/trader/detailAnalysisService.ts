import { proxyHistory } from '@/lib/market/marketDataProvider';
import {
  aggregateMarketAgentPoints,
  agentAssetTypeFromProvider,
  analyzeMarketAgentFromHistory,
  insufficientMarketAgentData,
  MARKET_AGENT_TIMEFRAME_CONFIG,
  normalizeMarketAgentCurrencyPoints,
  normalizeMarketAgentPoints,
  providerAssetTypeForAgent,
  type MarketAgentAssetType,
  type MarketAgentResponse,
  type MarketAgentSuccessResponse,
  type MarketAgentTimeframe,
} from '@/lib/market/marketAgent';
import { normalizeMarketSymbol, type NormalizedMarketSymbol } from '@/lib/market/normalizeSymbol';
import { searchBundledMarketSymbols } from '@/lib/market/marketSymbolDirectory';
import { validateSymbol, type MarketAssetType, type MarketSearchItem } from '@/lib/market/marketService';
import { resolveMarketSymbol } from '@/lib/market/symbolResolver';

type ProxyHistoryResponse = {
  success?: boolean;
  source?: string;
  code?: string;
  history?: unknown[];
  currency?: string | null;
};

type DetailSearchItem = MarketSearchItem & {
  companyNameAr?: string;
  companyNameEn?: string;
  exchangeLabelAr?: string;
  exchangeLabelEn?: string;
  marketLabel?: string | null;
  priceUnit?: string | null;
};

export type TraderDetailCandidate = {
  displaySymbol: string;
  providerSymbol: string;
  providerAssetType: MarketAssetType;
  responseAssetType: MarketAgentAssetType;
  name?: string | null;
  nameAr?: string | null;
  currency?: string | null;
  exchange?: string | null;
  exchangeLabelAr?: string | null;
  exchangeLabelEn?: string | null;
  region?: string | null;
  marketLabel?: string | null;
  priceUnit?: string | null;
};

export type TraderDetailAnalysisResult = {
  status: 'success' | 'no_data';
  symbol: string;
  candidate: TraderDetailCandidate | null;
  analysis: MarketAgentResponse;
  sparkline: number[];
  provider: string | null;
  providerCode?: string | null;
};

const GLOBAL_STOCK_SUFFIXES = [
  '.KW', '.SR', '.SA', '.DU', '.AD', '.AE', '.QA', '.BH', '.OM',
  '.T', '.HK', '.SS', '.SZ', '.KS', '.KQ', '.TW', '.TWO', '.NS', '.BO', '.SI', '.JK', '.BK', '.KL', '.AX',
  '.L', '.DE', '.F', '.PA', '.AS', '.BR', '.LS', '.MC', '.MI', '.SW', '.VI', '.ST', '.OL', '.CO', '.HE', '.WA',
  '.TO', '.V', '.MX', '.JO', '.IS', '.CA',
];

export function normalizeTraderDetailSymbol(value: unknown) {
  return String(value ?? '').trim().toUpperCase();
}

function inferAgentAssetType(symbol: string): MarketAgentAssetType {
  const compact = symbol.replace(/\s+/g, '').replace(/[\\/:-]/g, '').replace(/=X$/i, '').toUpperCase();
  if (/^[A-Z]{6}$/.test(compact) && ['USD', 'EUR', 'JPY', 'GBP', 'CHF', 'CAD', 'AUD', 'NZD'].includes(compact.slice(0, 3))) {
    return 'forex';
  }
  if (/^(BTC|ETH|BNB|SOL|XRP|ADA|AVAX)(USD)?$/.test(compact) || /-(USD|USDT)$/.test(symbol.toUpperCase())) {
    return 'crypto';
  }
  if (/^(XAUUSD|XAGUSD|GOLD|SILVER|GC=F|SI=F|USOIL|UKOIL|NATGAS|COPPER)$/i.test(symbol)) {
    return 'metal';
  }
  if (symbol.startsWith('^')) return 'index';
  return 'stock';
}

function resolveProviderAssetType(assetType: MarketAgentAssetType, normalizedAssetType?: MarketAssetType): MarketAssetType {
  if (normalizedAssetType && (assetType !== 'metal' || normalizedAssetType === 'gold' || normalizedAssetType === 'commodity')) {
    return normalizedAssetType;
  }
  return providerAssetTypeForAgent(assetType);
}

function candidateFromNormalized(normalized: NormalizedMarketSymbol, requestedAssetType: MarketAgentAssetType, requestedSymbol: string): TraderDetailCandidate {
  const providerAssetType = normalized.assetType;
  const displaySymbol = normalized.providerSymbol === requestedSymbol ? requestedSymbol : normalized.displaySymbol;
  return {
    displaySymbol,
    providerSymbol: normalized.providerSymbol,
    providerAssetType,
    responseAssetType: requestedAssetType === 'stock' ? agentAssetTypeFromProvider(providerAssetType) : requestedAssetType,
  };
}

function candidateFromSearchItem(item: DetailSearchItem, requestedAssetType: MarketAgentAssetType, requestedSymbol: string): TraderDetailCandidate | null {
  const providerSymbol = validateSymbol(item.providerSymbol ?? item.symbol);
  const fallbackDisplay = validateSymbol(item.symbol);
  if (!providerSymbol || !fallbackDisplay) return null;
  const providerAssetType = resolveProviderAssetType(requestedAssetType, item.assetType);
  return {
    displaySymbol: providerSymbol === requestedSymbol ? requestedSymbol : fallbackDisplay,
    providerSymbol,
    providerAssetType,
    responseAssetType: requestedAssetType === 'stock' ? agentAssetTypeFromProvider(providerAssetType) : requestedAssetType,
    name: item.companyNameEn || item.name || fallbackDisplay,
    nameAr: item.companyNameAr,
    currency: item.currency,
    exchange: item.exchange,
    exchangeLabelAr: item.exchangeLabelAr,
    exchangeLabelEn: item.exchangeLabelEn,
    region: item.country,
    marketLabel: item.marketLabel,
    priceUnit: item.priceUnit,
  };
}

function directGlobalStockCandidates(symbol: string, requestedAssetType: MarketAgentAssetType): TraderDetailCandidate[] {
  if (requestedAssetType !== 'stock') return [];
  const raw = symbol.trim().toUpperCase();
  if (!raw || /[.^=:/-]/.test(raw) || raw.length > 12 || !/^[A-Z0-9]+$/.test(raw)) return [];
  const suffixes = /^[0-9]+$/.test(raw)
    ? [
      '.T', '.HK', '.SS', '.SZ', '.KS', '.KQ', '.TW', '.TWO', '.NS', '.BO', '.SI', '.JK', '.BK', '.KL', '.AX',
      ...GLOBAL_STOCK_SUFFIXES.filter(suffix => !['.T', '.HK', '.SS', '.SZ', '.KS', '.KQ', '.TW', '.TWO', '.NS', '.BO', '.SI', '.JK', '.BK', '.KL', '.AX'].includes(suffix)),
    ]
    : GLOBAL_STOCK_SUFFIXES;

  return suffixes.map(suffix => ({
    displaySymbol: raw,
    providerSymbol: `${raw}${suffix}`,
    providerAssetType: 'stock' as MarketAssetType,
    responseAssetType: 'stock' as MarketAgentAssetType,
  }));
}

function uniqueCandidates(candidates: Array<TraderDetailCandidate | null | undefined>) {
  const seen = new Set<string>();
  return candidates
    .filter((candidate): candidate is TraderDetailCandidate => Boolean(candidate))
    .map(candidate => ({
      ...candidate,
      displaySymbol: validateSymbol(candidate.displaySymbol) ?? candidate.displaySymbol.toUpperCase(),
      providerSymbol: validateSymbol(candidate.providerSymbol),
    }))
    .filter((candidate): candidate is TraderDetailCandidate => Boolean(candidate.providerSymbol))
    .filter(candidate => {
      const key = `${candidate.providerSymbol}:${candidate.providerAssetType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 48);
}

export async function resolveTraderDetailCandidates(rawSymbol: string, requestedAssetType = inferAgentAssetType(rawSymbol)) {
  const requestedSymbol = normalizeTraderDetailSymbol(rawSymbol);
  const providerAssetType = providerAssetTypeForAgent(requestedAssetType);
  const [resolved, directoryResults] = await Promise.all([
    resolveMarketSymbol(requestedSymbol, providerAssetType).catch(() => null),
    Promise.resolve(searchBundledMarketSymbols({ query: requestedSymbol, assetType: providerAssetType, limit: 12 }) as DetailSearchItem[]),
  ]);
  const normalized = normalizeMarketSymbol(requestedSymbol, providerAssetType);
  const resolverItems = resolved
    ? resolved.ok
      ? [resolved.asset, ...resolved.suggestions]
      : resolved.suggestions
    : [];

  return uniqueCandidates([
    ...directoryResults.map(item => candidateFromSearchItem(item, requestedAssetType, requestedSymbol)),
    ...resolverItems.map(item => candidateFromSearchItem(item as DetailSearchItem, requestedAssetType, requestedSymbol)),
    normalized ? candidateFromNormalized(normalized, requestedAssetType, requestedSymbol) : null,
    ...directGlobalStockCandidates(requestedSymbol, requestedAssetType),
  ]);
}

export async function runTraderDetailAnalysis(rawSymbol: string, timeframe: MarketAgentTimeframe = '1D'): Promise<TraderDetailAnalysisResult> {
  const symbol = normalizeTraderDetailSymbol(rawSymbol);
  const candidates = await resolveTraderDetailCandidates(symbol);
  const assetType = candidates[0]?.responseAssetType ?? inferAgentAssetType(symbol);
  const config = MARKET_AGENT_TIMEFRAME_CONFIG[timeframe];
  let lastCandidate = candidates[0] ?? null;
  let lastProvider = 'yahoo';
  let lastCode: string | null = null;

  for (const candidate of candidates) {
    lastCandidate = candidate;
    const historyResult = await proxyHistory(candidate.providerSymbol, candidate.providerAssetType, config.period, config.interval) as ProxyHistoryResponse;
    lastProvider = String(historyResult.source ?? 'yahoo');
    lastCode = typeof historyResult.code === 'string' ? historyResult.code : null;
    if (!historyResult.success || !Array.isArray(historyResult.history) || historyResult.history.length === 0) continue;

    const rawPoints = normalizeMarketAgentPoints(historyResult.history);
    const normalizedCurrency = normalizeMarketAgentCurrencyPoints(rawPoints, {
      symbol,
      providerSymbol: candidate.providerSymbol,
      assetType: candidate.providerAssetType,
      providerCurrency: historyResult.currency ?? candidate.currency,
    });
    const points = aggregateMarketAgentPoints(normalizedCurrency.points, config.aggregateHours);
    const analysis = analyzeMarketAgentFromHistory({
      symbol,
      assetType: candidate.responseAssetType,
      timeframe,
      providerSymbol: candidate.providerSymbol,
      providerAssetType: candidate.providerAssetType,
      currency: normalizedCurrency.currency,
      source: lastProvider,
      updatedAt: new Date().toISOString(),
    }, points);

    if (analysis.ok) {
      return {
        status: 'success',
        symbol,
        candidate,
        analysis,
        sparkline: points.slice(-90).map(point => point.close).filter(Number.isFinite),
        provider: lastProvider,
        providerCode: lastCode,
      };
    }
  }

  return {
    status: 'no_data',
    symbol,
    candidate: lastCandidate,
    analysis: insufficientMarketAgentData({
      symbol,
      assetType: lastCandidate?.responseAssetType ?? assetType,
      timeframe,
      source: lastProvider,
      updatedAt: new Date().toISOString(),
    }, lastCode === 'invalid_symbol' ? 'INVALID_SYMBOL' : 'INSUFFICIENT_MARKET_DATA'),
    sparkline: [],
    provider: lastProvider,
    providerCode: lastCode,
  };
}

export function isMarketAgentSuccess(value: MarketAgentResponse): value is MarketAgentSuccessResponse {
  return value.ok === true && value.success === true;
}
