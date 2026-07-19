import type {
  CanonicalAssetIdentity,
  IntelligenceHorizon,
} from '@/domain/intelligence/contracts';
import type {
  IntelligenceHistoricalPriceAttempt,
  IntelligenceHistoricalPriceHistory,
  IntelligenceHistoricalPricePoint,
} from '@/domain/intelligence/outcomes';
import { getOutcomeWindowConfig } from '@/lib/intelligence/outcomePolicy';
import { marketAssetTypeFromIntelligence } from '@/lib/intelligence/assetTypes';
import { fetchYahooHistory } from '@/lib/market/fetchYahooHistory';

export type HistoricalPriceRequest = {
  asset: CanonicalAssetIdentity;
  horizon: IntelligenceHorizon;
  from: string;
  to: string;
};

export interface IntelligenceHistoricalPriceProvider {
  id: string;
  supports(asset: CanonicalAssetIdentity): boolean;
  getHistory(request: HistoricalPriceRequest): Promise<IntelligenceHistoricalPriceHistory | null>;
}

function finite(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function withinWindow(point: { at: string }, from: string, to: string) {
  const at = Date.parse(point.at);
  const start = Date.parse(from);
  const end = Date.parse(to);
  return Number.isFinite(at) && Number.isFinite(start) && Number.isFinite(end) && at >= start && at <= end;
}

function mapHistoryPoint(input: {
  point: {
    date: string;
    open?: number;
    high?: number;
    low?: number;
    close: number;
    adjustedClose?: number | null;
    volume?: number | null;
  };
  useAdjustedClose: boolean;
  hasAdjustment: boolean;
}): IntelligenceHistoricalPricePoint | null {
  const close = input.useAdjustedClose ? finite(input.point.adjustedClose) : finite(input.point.close);
  const parsedAt = Date.parse(input.point.date);
  if (!close || !Number.isFinite(parsedAt)) return null;
  const at = new Date(parsedAt).toISOString();
  const useRawOhlc = !input.useAdjustedClose || !input.hasAdjustment;
  return {
    at,
    open: useRawOhlc ? finite(input.point.open) : null,
    high: useRawOhlc ? finite(input.point.high) : null,
    low: useRawOhlc ? finite(input.point.low) : null,
    close,
    volume: Number.isFinite(Number(input.point.volume)) && Number(input.point.volume) >= 0 ? Number(input.point.volume) : null,
  };
}

function failedAttempt(provider: string, startedAt: number, code: string): IntelligenceHistoricalPriceAttempt {
  return {
    provider,
    status: 'FAILED',
    code,
    latencyMs: Math.max(0, Date.now() - startedAt),
    cached: false,
    dataAsOf: null,
  };
}

/**
 * Dedicated Phase 6.2A adapter. It intentionally does not call the generic
 * multi-provider candle fallback because that path can serve unlabelled stale data.
 */
export class YahooIntelligenceHistoricalPriceProvider implements IntelligenceHistoricalPriceProvider {
  readonly id = 'yahoo-finance-history';

  supports() {
    return true;
  }

  async getHistory(request: HistoricalPriceRequest): Promise<IntelligenceHistoricalPriceHistory | null> {
    const startedAt = Date.now();
    const config = getOutcomeWindowConfig(request.horizon);
    const result = await fetchYahooHistory(
      request.asset.providerSymbol,
      marketAssetTypeFromIntelligence(request.asset.assetType),
      config.historyPeriod,
      config.interval,
    );
    if (!result.success) return null;

    const daily = config.interval === '1d';
    const allHaveAdjustedClose = daily && result.history.length > 0
      && result.history.every(point => finite(point.adjustedClose) !== null);
    const hasAdjustment = allHaveAdjustedClose && result.history.some(point => {
      const adjusted = finite(point.adjustedClose);
      const raw = finite(point.close);
      return adjusted !== null && raw !== null && Math.abs(adjusted - raw) > Math.max(0.000001, raw * 0.000001);
    });
    const points = result.history
      .map(point => mapHistoryPoint({ point, useAdjustedClose: allHaveAdjustedClose, hasAdjustment }))
      .filter((point): point is IntelligenceHistoricalPricePoint => point !== null)
      .filter(point => withinWindow(point, request.from, request.to))
      .sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
    const dataAsOf = points.at(-1)?.at ?? null;
    const attempt: IntelligenceHistoricalPriceAttempt = {
      provider: result.provider,
      status: points.length ? 'SUCCESS' : 'FAILED',
      code: points.length ? null : 'HISTORY_WINDOW_NOT_COVERED',
      latencyMs: Math.max(0, Date.now() - startedAt),
      cached: result.cached === true,
      dataAsOf,
    };
    if (!points.length) return null;

    return {
      provider: result.provider,
      providerSymbol: result.providerSymbol,
      currency: result.currency?.trim().toUpperCase() ?? null,
      receivedAt: new Date().toISOString(),
      dataAsOf,
      deliveryState: result.cached ? 'CACHED' : 'DELAYED',
      cacheAgeSeconds: result.cached ? result.cacheAgeSeconds ?? null : 0,
      adjustedPrices: allHaveAdjustedClose ? 'VERIFIED' : 'UNSUPPORTED',
      points,
      attempts: [attempt],
      warnings: [
        'YAHOO_HISTORY_DELAYED',
        ...(result.cached ? ['YAHOO_HISTORY_CACHED'] : []),
        ...(allHaveAdjustedClose ? ['PROVIDER_ADJUSTED_CLOSE_USED'] : ['ADJUSTED_CLOSE_UNAVAILABLE']),
        ...(hasAdjustment ? ['MFE_MAE_UNAVAILABLE_FOR_ADJUSTED_PRICE_SERIES'] : []),
      ],
    };
  }
}

export class MemoryIntelligenceHistoricalPriceProvider implements IntelligenceHistoricalPriceProvider {
  readonly id = 'memory-history';

  constructor(private readonly history: IntelligenceHistoricalPriceHistory | null) {}

  supports() {
    return true;
  }

  async getHistory() {
    return this.history ? structuredClone(this.history) : null;
  }
}

export function unavailableHistoryAttempt(provider: string, startedAt: number, code: string) {
  return failedAttempt(provider, startedAt, code);
}
