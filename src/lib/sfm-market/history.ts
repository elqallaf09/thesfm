import {
  getCandlesWithFallback,
  type MarketDataProviderContext,
  type NormalizedMarketCandle,
  type ProviderAttemptFailure,
} from '@/lib/market/marketDataProviders';
import { normalizeMarketSymbolInput } from '@/lib/market/marketService';
import {
  SFM_MARKET_BLOCKED_TRANSITIONAL_PROVIDERS,
  type SfmMarketRequest,
} from '@/lib/sfm-market/engine';

export type SfmMarketHistoryResult =
  | {
      ok: true;
      symbol: string;
      providerSymbol: string;
      provider: string;
      candles: NormalizedMarketCandle[];
      attempts: ProviderAttemptFailure[];
    }
  | {
      ok: false;
      symbol: string;
      providerSymbol: string | null;
      provider: null;
      candles: [];
      attempts: ProviderAttemptFailure[];
      reason: string | null;
    };

function contextForHistory(
  symbol: string,
  market: string | null,
  assetType: string | null | undefined,
  forceFresh: boolean | undefined,
): MarketDataProviderContext {
  return {
    symbol,
    market,
    assetType,
    forceFresh,
    excludeProviders: [...SFM_MARKET_BLOCKED_TRANSITIONAL_PROVIDERS],
  };
}

export async function getSfmMarketHistory(
  symbolInput: string,
  request: SfmMarketRequest = {},
): Promise<SfmMarketHistoryResult> {
  const normalized = normalizeMarketSymbolInput(symbolInput, request.assetType);
  if (!normalized.valid) {
    return {
      ok: false,
      symbol: String(symbolInput ?? '').trim().toUpperCase(),
      providerSymbol: null,
      provider: null,
      candles: [],
      attempts: [],
      reason: normalized.code ?? 'INVALID_SYMBOL',
    };
  }

  const market = request.market ?? null;
  const context = contextForHistory(
    normalized.symbol,
    market,
    normalized.assetType,
    request.forceFresh,
  );
  const result = await getCandlesWithFallback(normalized.providerSymbol, market, '1d', context);

  if (!result.ok) {
    return {
      ok: false,
      symbol: normalized.symbol,
      providerSymbol: normalized.providerSymbol,
      provider: null,
      candles: [],
      attempts: result.attempts,
      reason: result.latestError,
    };
  }

  return {
    ok: true,
    symbol: normalized.symbol,
    providerSymbol: normalized.providerSymbol,
    provider: result.provider,
    candles: result.data,
    attempts: result.attempts,
  };
}
