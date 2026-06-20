import { NextRequest, NextResponse } from 'next/server';
import { proxyAnalyze } from '@/lib/market/marketDataProvider';
import { marketApiMessage, normalizeMarketApiCode, resolveMarketSymbol } from '@/lib/market/symbolResolver';

function statusForCode(code?: string) {
  const normalized = normalizeMarketApiCode(code);
  if (normalized === 'TIMEOUT') return 408;
  if (normalized === 'INVALID_SYMBOL') return 404;
  if (normalized === 'NO_DATA') return 422;
  if (normalized === 'RATE_LIMIT') return 429;
  if (normalized === 'PROVIDER_DOWN') return 503;
  return 400;
}

function publicFailure(codeInput?: string, patch: Record<string, unknown> = {}) {
  const code = normalizeMarketApiCode(codeInput);
  return {
    ok: false,
    success: false,
    code,
    message: marketApiMessage(code),
    error: marketApiMessage(code),
    suggestions: [],
    ...patch,
  };
}

async function analyzeResolved(input: {
  symbol: unknown;
  assetType: unknown;
  displaySymbol?: unknown;
  name?: unknown;
  exchange?: unknown;
  country?: unknown;
  currency?: unknown;
}) {
  const resolverQuery = input.displaySymbol || input.symbol;
  const resolved = await resolveMarketSymbol(resolverQuery, input.assetType);
  if (!resolved.ok) {
    console.info('[market/analyze] invalid symbol rejected before provider request', {
      requestedSymbol: String(resolverQuery ?? ''),
      assetType: input.assetType,
      suggestions: resolved.suggestions.map(item => item.symbol),
    });
    return publicFailure('INVALID_SYMBOL', {
      suggestions: resolved.suggestions,
      marketDataService: 'connected',
    });
  }

  const result = await proxyAnalyze(resolved.asset.providerSymbol, resolved.asset.assetType, {
    displaySymbol: resolved.asset.symbol,
    name: typeof input.name === 'string' && input.name.trim() ? input.name : resolved.asset.name,
    exchange: input.exchange ?? resolved.asset.exchange,
    country: input.country ?? resolved.asset.country,
    currency: input.currency ?? resolved.asset.currency,
  });

  if (result.success) {
    return {
      ok: true,
      ...result,
      symbol: resolved.asset.symbol,
      providerSymbol: result.providerSymbol ?? resolved.asset.providerSymbol,
      name: result.name ?? resolved.asset.name,
      assetType: resolved.asset.assetType,
      exchange: result.exchange ?? resolved.asset.exchange,
      country: result.country ?? resolved.asset.country,
      currency: result.currency ?? resolved.asset.currency,
      suggestions: resolved.suggestions,
    };
  }

  const code = normalizeMarketApiCode(result.code);
  console.warn('[market/analyze] provider failed', {
    requestedSymbol: String(input.symbol ?? ''),
    resolvedSymbol: resolved.asset.symbol,
    providerSymbol: resolved.asset.providerSymbol,
    assetType: resolved.asset.assetType,
    code,
    providerCode: result.code,
    marketDataService: result.marketDataService,
    error: result.error,
  });

  return publicFailure(code, {
    providerCode: result.code,
    suggestions: resolved.suggestions,
    marketDataService: result.marketDataService,
    dataStatus: 'unavailable',
    source: 'yahoo',
    fallback: false,
    warnings: result.warnings,
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const result = await analyzeResolved({
    symbol: searchParams.get('symbol'),
    assetType: searchParams.get('assetType'),
    displaySymbol: searchParams.get('displaySymbol'),
    name: searchParams.get('name'),
    exchange: searchParams.get('exchange'),
    country: searchParams.get('country'),
    currency: searchParams.get('currency'),
  });
  return NextResponse.json(result, { status: result.success ? 200 : statusForCode(result.code) });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const result = await analyzeResolved({
    symbol: body?.symbol,
    assetType: body?.assetType,
    displaySymbol: body?.displaySymbol ?? body?.symbol,
    name: body?.name,
    exchange: body?.exchange,
    country: body?.country,
    currency: body?.currency,
  });
  return NextResponse.json(result, { status: result.success ? 200 : statusForCode(result.code) });
}
