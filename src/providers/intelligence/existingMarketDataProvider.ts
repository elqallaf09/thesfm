import type {
  AnalysisRequest,
  CanonicalAssetIdentity,
  IntelligenceProvider,
  NormalizedIntelligenceCandle,
  ProviderAttempt,
  VerifiedIntelligenceSnapshot,
} from '@/domain/intelligence/contracts';
import { proxyAnalyze } from '@/lib/market/marketDataProvider';
import type { MarketAnalysis } from '@/lib/market/marketService';
import { marketAssetTypeFromIntelligence } from '@/lib/intelligence/assetTypes';
import { IntelligenceError } from '@/services/intelligence/errors';

function validIso(value: unknown) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

function finite(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dataAsOf(analysis: MarketAnalysis) {
  return validIso(analysis.quote?.timestamp)
    ?? validIso(analysis.lastUpdated)
    ?? validIso(analysis.fetchedAt)
    ?? validIso(analysis.history.at(-1)?.date);
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

function operationalReliability(analysis: MarketAnalysis) {
  if (analysis.cached) return 0.65;
  if (analysis.dataStatus === 'delayed') return 0.8;
  if (analysis.fallback) return 0.85;
  return 1;
}

function providerAttempt(analysis: MarketAnalysis, startedAt: number): ProviderAttempt {
  return {
    provider: String(analysis.provider ?? analysis.source ?? 'existing-market-pipeline').slice(0, 80),
    capability: 'ANALYSIS_SNAPSHOT',
    status: 'SUCCESS',
    code: null,
    latencyMs: Math.max(0, Date.now() - startedAt),
    fallbackUsed: analysis.fallback === true,
    dataAsOf: dataAsOf(analysis),
  };
}

export class ExistingMarketDataIntelligenceProvider implements IntelligenceProvider {
  readonly id = 'existing-market-pipeline';

  supports() {
    return true;
  }

  async getSnapshot(request: AnalysisRequest, asset: CanonicalAssetIdentity): Promise<VerifiedIntelligenceSnapshot> {
    const startedAt = Date.now();
    const result = await proxyAnalyze(
      asset.providerSymbol,
      marketAssetTypeFromIntelligence(asset.assetType),
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
    const candles = normalizeCandles(result);
    if (price === null || price <= 0 || candles.length === 0) {
      throw new IntelligenceError('PROVIDER_UNAVAILABLE', true);
    }
    const asOf = dataAsOf(result);
    const provider = String(result.provider ?? result.source ?? this.id).slice(0, 80);
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
      fallbackUsed: result.fallback === true,
      operationalReliability: operationalReliability(result),
      reportedRiskLevel: result.riskLevel === 'high' ? 'HIGH' : result.riskLevel === 'medium' ? 'MEDIUM' : result.riskLevel === 'low' ? 'LOW' : null,
      quote: {
        price,
        change: finite(result.quote?.change),
        changePercent: finite(result.quote?.changePercent ?? result.changePercent),
        volume: finite(result.quote && 'volume' in result.quote ? result.quote.volume : null),
      },
      levels: {
        support: result.fallback === true ? null : finite(result.levels?.support),
        resistance: result.fallback === true ? null : finite(result.levels?.resistance),
      },
      candles,
      fundamentals: result.fundamentalsAvailable === false ? null : result.fundamentals ?? null,
      fundamentalsSource: result.fundamentalsAvailable === false ? null : result.fundamentalsSource ?? provider,
      sharia: {
        status: result.shariahStatus ?? null,
        reason: result.shariahReason ?? null,
        source: result.shariahSource ?? null,
        reviewedAt: result.shariahLastReviewedAt ?? null,
      },
      warnings: Array.isArray(result.warnings) ? result.warnings.map((_, index) => `PROVIDER_WARNING_${index + 1}`) : [],
      providerAttempts: [providerAttempt(result, startedAt)],
    };
  }
}
