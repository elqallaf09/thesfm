import { NextRequest, NextResponse } from 'next/server';
import { proxyHistory } from '@/lib/market/openbbProxy';
import { detectPriceUnit, normalizeMarketPrice, resolveMarketCurrency } from '@/lib/market/marketCurrency';
import { normalizeMarketSymbol } from '@/lib/market/normalizeSymbol';
import { normalizeAssetType } from '@/lib/market/marketService';

type MarketChartRange = '1D' | '1W' | '1M' | '6M' | '1Y';

const RANGE_CONFIG: Record<MarketChartRange, { period: string; interval: string }> = {
  '1D': { period: '1d', interval: '5m' },
  '1W': { period: '5d', interval: '30m' },
  '1M': { period: '1mo', interval: '1d' },
  '6M': { period: '6mo', interval: '1d' },
  '1Y': { period: '1y', interval: '1d' },
};

function normalizeRange(value: unknown): MarketChartRange {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === '1D' || normalized === '1W' || normalized === '1M' || normalized === '6M' || normalized === '1Y') return normalized;
  if (normalized === '1MO') return '1M';
  if (normalized === '6MO') return '6M';
  if (normalized === '12M' || normalized === '1YR') return '1Y';
  return '1D';
}

function normalizePeriod(value: unknown, fallback: string) {
  const normalized = String(value ?? '').trim();
  const upper = normalized.toUpperCase();
  if (!normalized) return fallback;
  if (upper === '1D') return '1d';
  if (upper === '1W') return '5d';
  if (upper === '1M' || upper === '1MO') return '1mo';
  if (upper === '6M' || upper === '6MO') return '6mo';
  if (upper === '1Y' || upper === '1YR' || upper === '12M') return '1y';
  return normalized;
}

function uniqueCandidates(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return values
    .map(value => String(value ?? '').trim())
    .filter(Boolean)
    .filter(value => {
      const key = value.toUpperCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeHistoryPoints(history: unknown) {
  if (!Array.isArray(history)) return [];
  return history
    .map(point => {
      const item = point && typeof point === 'object' ? point as Record<string, unknown> : {};
      const close = Number(item.close ?? item.c);
      const time = String(item.date ?? item.time ?? item.timestamp ?? '').trim();
      if (!time || !Number.isFinite(close)) return null;
      const open = Number(item.open ?? item.o);
      const high = Number(item.high ?? item.h);
      const low = Number(item.low ?? item.l);
      const volume = Number(item.volume ?? item.v);
      return {
        time,
        open: Number.isFinite(open) ? open : null,
        high: Number.isFinite(high) ? high : null,
        low: Number.isFinite(low) ? low : null,
        close,
        volume: Number.isFinite(volume) ? volume : null,
      };
    })
    .filter((point): point is NonNullable<typeof point> => point !== null);
}

function normalizeHistoryCurrencyPoints(points: ReturnType<typeof normalizeHistoryPoints>, input: {
  symbol: string;
  providerSymbol: string;
  assetType: string;
}) {
  const currency = resolveMarketCurrency({
    symbol: input.symbol,
    providerSymbol: input.providerSymbol,
    assetType: input.assetType,
  });
  const lastClose = points.at(-1)?.close ?? null;
  const priceUnit = detectPriceUnit({
    price: lastClose,
    currency: currency.currency,
    symbol: input.symbol,
    providerSymbol: input.providerSymbol,
    assetType: input.assetType,
  });
  const normalizeValue = (value: number | null) => normalizeMarketPrice({
    price: value,
    currency: currency.currency,
    symbol: input.symbol,
    providerSymbol: input.providerSymbol,
    assetType: input.assetType,
    priceUnit,
  }).price;

  return {
    currency: currency.currency,
    currencySource: currency.source,
    priceUnit,
    points: points.map(point => ({
      ...point,
      open: normalizeValue(point.open),
      high: normalizeValue(point.high),
      low: normalizeValue(point.low),
      close: normalizeValue(point.close) ?? point.close,
    })),
  };
}

function statusForCode(code?: string) {
  if (code === 'openbb_timeout') return 408;
  if (code === 'invalid_symbol' || code === 'provider_no_data' || code === 'PRICE_HISTORY_UNAVAILABLE') return 422;
  if (code === 'openbb_unreachable' || code === 'provider_error') return 503;
  return 400;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const assetTypeInput = searchParams.get('assetType');
  const requestedAssetType = normalizeAssetType(assetTypeInput);
  const requestedRange = normalizeRange(searchParams.get('range') ?? searchParams.get('period'));
  const rangeConfig = RANGE_CONFIG[requestedRange];
  const period = normalizePeriod(searchParams.get('period'), rangeConfig.period);
  const interval = searchParams.get('interval') || rangeConfig.interval;
  const symbolInput = searchParams.get('symbol');
  const providerSymbolInput = searchParams.get('providerSymbol');
  const normalized = normalizeMarketSymbol(symbolInput || providerSymbolInput, assetTypeInput ?? requestedAssetType);
  const assetType = normalized?.assetType ?? requestedAssetType;
  const displaySymbol = normalized?.displaySymbol ?? symbolInput ?? providerSymbolInput ?? '';
  const candidates = uniqueCandidates([
    providerSymbolInput,
    normalized?.providerSymbol,
    symbolInput,
    ...(normalized?.alternatives ?? []),
  ]);

  if (candidates.length === 0) {
    return NextResponse.json({
      ok: false,
      success: false,
      code: 'invalid_symbol',
      symbol: displaySymbol,
      range: requestedRange,
      interval,
      points: [],
      source: 'yahoo',
      updated_at: new Date().toISOString(),
      error: 'Invalid symbol.',
    }, { status: statusForCode('invalid_symbol') });
  }

  let result: Awaited<ReturnType<typeof proxyHistory>> | null = null;
  let providerSymbol = candidates[0];

  for (const candidate of candidates) {
    const attempt = await proxyHistory(candidate, assetType, period, interval);
    result = attempt;
    if (attempt.success && Array.isArray(attempt.history) && attempt.history.length > 0) {
      providerSymbol = candidate;
      break;
    }
  }

  const normalizedHistory = normalizeHistoryCurrencyPoints(normalizeHistoryPoints(result?.history), {
    symbol: displaySymbol,
    providerSymbol,
    assetType,
  });
  const points = normalizedHistory.points;
  if (result?.success && points.length > 0) {
    return NextResponse.json({
      ...result,
      ok: true,
      success: true,
      symbol: displaySymbol,
      providerSymbol,
      range: requestedRange,
      period,
      interval,
      points,
      currency: normalizedHistory.currency,
      currencySource: normalizedHistory.currencySource,
      priceUnit: normalizedHistory.priceUnit,
      source: result.source ?? 'yahoo',
      updated_at: new Date().toISOString(),
    });
  }

  const code = result?.code || 'PRICE_HISTORY_UNAVAILABLE';
  return NextResponse.json({
    ok: false,
    success: false,
    code,
    symbol: displaySymbol,
    providerSymbol,
    range: requestedRange,
    period,
    interval,
    points: [],
    history: [],
    source: 'yahoo',
    updated_at: new Date().toISOString(),
    error: result?.error || 'Price history is unavailable.',
  }, { status: statusForCode(code) });
}
