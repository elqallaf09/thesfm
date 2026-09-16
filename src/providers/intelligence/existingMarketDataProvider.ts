import type {
  AnalysisRequest,
  CanonicalAssetIdentity,
  IntelligenceProvider,
  NormalizedIntelligenceCandle,
  ProviderAttempt,
  VerifiedIntelligenceSnapshot,
} from '@/domain/intelligence/contracts';
import { marketAssetTypeFromIntelligence } from '@/lib/intelligence/assetTypes';
import { proxyAnalyze, proxyHistory } from '@/lib/market/marketDataProvider';
import { detectPriceUnit, normalizeMarketPrice, resolveMarketCurrency } from '@/lib/market/marketCurrency';
import type { MarketAnalysis, MarketAssetType } from '@/lib/market/marketService';
import { IntelligenceError } from '@/services/intelligence/errors';

function validIso(value: unknown) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

function finite(value: unknown) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function latestObservedAt(values: Array<string | null>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null;
}

function dataAsOf(analysis: MarketAnalysis, candles: NormalizedIntelligenceCandle[] = []) {
  return latestObservedAt([
    validIso(analysis.quote?.timestamp),
    validIso(analysis.lastUpdated),
    validIso(analysis.history.at(-1)?.date),
    candles.at(-1)?.at ?? null,
  ]) ?? validIso(analysis.fetchedAt);
}

function normalizeCandles(analysis: MarketAnalysis): NormalizedIntelligenceCandle[] {
  return analysis.history
    .map(point => ({
      at: validIso(point.date),
      open: finite(point.open),
      high: finite(point.high),
      low: finite(point.low),
      close: finite(point.close),
      volume: finite(point.volume),
    }))
    .filter((point): point is NormalizedIntelligenceCandle => Boolean(point.at && point.close !== null && point.close > 0))
    .map(point => ({ ...point, at: point.at! }));
}

function normalizeSupplementalCandles(
  payload: unknown,
  asset: CanonicalAssetIdentity,
  marketAssetType: MarketAssetType,
): NormalizedIntelligenceCandle[] {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return [];
  const record = payload as Record<string, unknown>;
  const rows = Array.isArray(record.points)
    ? record.points
    : Array.isArray(record.history)
      ? record.history
      : [];
  const rawLastClose = [...rows].reverse().map(row => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
    return finite((row as Record<string, unknown>).close);
  }).find(value => value !== null && value > 0) ?? null;
  const providerCurrency = typeof record.currency === 'string' ? record.currency : undefined;
  const currency = resolveMarketCurrency({
    providerCurrency,
    symbol: asset.displaySymbol,
    providerSymbol: asset.providerSymbol,
    exchange: asset.exchange,
    market: asset.market,
    country: asset.country,
    assetType: marketAssetType,
  });
  const priceUnit = detectPriceUnit({
    price: rawLastClose,
    currency: currency.currency,
    providerCurrency,
    symbol: asset.displaySymbol,
    providerSymbol: asset.providerSymbol,
    exchange: asset.exchange,
    market: asset.market,
    assetType: marketAssetType,
  });
  const normalizeValue = (value: unknown) => normalizeMarketPrice({
    price: finite(value),
    currency: currency.currency,
    providerCurrency,
    symbol: asset.displaySymbol,
    providerSymbol: asset.providerSymbol,
    exchange: asset.exchange,
    market: asset.market,
    assetType: marketAssetType,
    priceUnit,
  }).price;

  return rows
    .map(row => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
      const item = row as Record<string, unknown>;
      const at = validIso(item.time ?? item.date ?? item.timestamp);
      const close = normalizeValue(item.close);
      if (!at || close === null || close <= 0) return null;
      return {
        at,
        open: normalizeValue(item.open),
        high: normalizeValue(item.high),
        low: normalizeValue(item.low),
        close,
        volume: finite(item.volume),
      } satisfies NormalizedIntelligenceCandle;
    })
    .filter((item): item is NormalizedIntelligenceCandle => item !== null);
}

function supplementalProviderId(payload: unknown) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  const value = typeof record.fallbackProvider === 'string'
    ? record.fallbackProvider
    : typeof record.source === 'string'
      ? record.source
      : null;
  if (!value) return null;
  return value.toLowerCase().includes('yahoo') ? 'yahoo' : value.trim().toLowerCase().replace(/\s+/g, '_').slice(0, 40);
}

function operationalReliability(analysis: MarketAnalysis) {
  if (analysis.cached) return 0.65;
  if (analysis.dataStatus === 'delayed') return 0.8;
  if (analysis.fallback) return 0.85;
  return 1;
}

function providerAttempt(
  analysis: MarketAnalysis,
  startedAt: number,
  input?: { provider?: string; fallbackUsed?: boolean; observedAt?: string | null },
): ProviderAttempt {
  return {
    provider: String(input?.provider ?? analysis.provider ?? analysis.source ?? 'existing-market-pipeline').slice(0, 80),
    capability: 'ANALYSIS_SNAPSHOT',
    status: 'SUCCESS',
    code: null,
    latencyMs: Math.max(0, Date.now() - startedAt),
    fallbackUsed: input?.fallbackUsed ?? analysis.fallback === true,
    dataAsOf: input?.observedAt ?? dataAsOf(analysis),
  };
}

export class ExistingMarketDataIntelligenceProvider implements IntelligenceProvider {
  readonly id = 'existing-market-pipeline';

  supports() {
    return true;
  }

  async getSnapshot(request: AnalysisRequest, asset: CanonicalAssetIdentity): Promise<VerifiedIntelligenceSnapshot> {
    const startedAt = Date.now();
    const marketAssetType = marketAssetTypeFromIntelligence(asset.assetType);
    const result = await proxyAnalyze(
      asset.providerSymbol,
      marketAssetType,
      {
        displaySymbol: asset.displaySymbol,
        name: asset.name,
        exchange: asset.exchange,
        country: asset.country,
        currency: asset.quoteCurrency,
      },
    );
    if (!result.success) {
      const code = String(result.code ?? '').toUpperCase();
      if (code.includes('INVALID') || code.includes('NOT_FOUND')) throw new IntelligenceError('INVALID_ASSET', false);
      if (code.includes('TIMEOUT')) throw new IntelligenceError('PROVIDER_TIMEOUT', true);
      throw new IntelligenceError('PROVIDER_UNAVAILABLE', true);
    }

    const price = finite(result.latestPrice);
    let candles = normalizeCandles(result);
    const hasPrimaryHistory = candles.length > 0;
    let supplementalHistoryUsed = false;
    let supplementalProvider: string | null = null;

    if (candles.length === 0) {
      const historyResult = await proxyHistory(asset.providerSymbol, marketAssetType, '1y', '1d').catch(() => null);
      const recovered = normalizeSupplementalCandles(historyResult, asset, marketAssetType);
      if (recovered.length > 0) {
        candles = recovered;
        supplementalHistoryUsed = true;
        supplementalProvider = supplementalProviderId(historyResult);
      }
    }

    if (price === null || price <= 0 || candles.length === 0) {
      throw new IntelligenceError('PROVIDER_UNAVAILABLE', true);
    }

    const asOf = dataAsOf(result, candles);
    const primaryProvider = String(result.provider ?? result.source ?? this.id).slice(0, 80);
    const provider = supplementalHistoryUsed && supplementalProvider && supplementalProvider !== primaryProvider
      ? `${primaryProvider}+${supplementalProvider}`.slice(0, 80)
      : primaryProvider;
    const fallbackUsed = result.fallback === true || supplementalHistoryUsed;
    const dataStatus: VerifiedIntelligenceSnapshot['dataStatus'] = result.cached
      ? 'CACHED'
      : result.dataStatus === 'delayed'
        ? 'DELAYED'
        : 'LIVE';

    return {
      asset: {
        ...asset,
        name: result.name || asset.name,
        exchange: result.exchange ?? asset.exchange,
        market: result.market ?? asset.market,
        quoteCurrency: result.currency ?? asset.quoteCurrency,
        country: result.country ?? asset.country,
      },
      provider,
      receivedAt: new Date().toISOString(),
      dataAsOf: asOf,
      dataStatus,
      fallbackUsed,
      operationalReliability: supplementalHistoryUsed
        ? Math.min(operationalReliability(result), 0.85)
        : operationalReliability(result),
      reportedRiskLevel: !hasPrimaryHistory ? null : result.riskLevel === 'high' ? 'HIGH' : result.riskLevel === 'medium' ? 'MEDIUM' : result.riskLevel === 'low' ? 'LOW' : null,
      quote: {
        price,
        change: finite(result.quote?.change),
        changePercent: finite(result.quote?.changePercent ?? result.changePercent),
        volume: finite(result.quote && 'volume' in result.quote ? result.quote.volume : null),
      },
      levels: {
        support: result.fallback === true || !hasPrimaryHistory ? null : finite(result.levels?.support),
        resistance: result.fallback === true || !hasPrimaryHistory ? null : finite(result.levels?.resistance),
      },
      candles,
      fundamentals: result.fundamentalsAvailable === false ? null : result.fundamentals ?? null,
      fundamentalsSource: result.fundamentalsAvailable === false ? null : result.fundamentalsSource ?? primaryProvider,
      sharia: {
        status: result.shariahStatus ?? null,
        reason: result.shariahReason ?? null,
        source: result.shariahSource ?? null,
        reviewedAt: result.shariahLastReviewedAt ?? null,
      },
      warnings: [
        ...(Array.isArray(result.warnings) ? result.warnings.map((_, index) => `PROVIDER_WARNING_${index + 1}`) : []),
        ...(supplementalHistoryUsed ? ['SUPPLEMENTAL_HISTORY_FALLBACK_USED'] : []),
      ],
      providerAttempts: [providerAttempt(result, startedAt, { provider, fallbackUsed, observedAt: asOf })],
    };
  }
}
