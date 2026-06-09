import { NextRequest, NextResponse } from 'next/server';
import { getUserFromBearerToken } from '@/lib/server/adminAccess';
import { findAssetAliasMatches } from '@/lib/market/assetAliases';
import { fetchYahooNormalizedQuote } from '@/lib/market/fetchYahooQuote';
import { normalizeMarketPrice, resolveMarketCurrency } from '@/lib/market/marketCurrency';
import { normalizeAssetType, validateSymbol } from '@/lib/market/marketService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
};

function addCandidate(candidates: string[], value: unknown) {
  const valid = validateSymbol(value);
  if (valid && !candidates.includes(valid)) candidates.push(valid);
}

function baseEquitySymbol(value: string) {
  return value
    .toUpperCase()
    .replace(/:KSE$/, '')
    .replace(/\.KW$/, '')
    .replace(/\.SR$/, '')
    .replace(/\.SA$/, '');
}

function isKuwaitHolding(input: { symbol: string; displaySymbol: string; name: string; market: string }) {
  const identity = `${input.symbol} ${input.displaySymbol} ${input.name} ${input.market}`;
  return /\.KW\b|:KSE\b|boursa\s*kuwait|kuwait|kse|الكويت|بوبيان|بيتك|بيت التمويل/i.test(identity);
}

function isSaudiHolding(input: { symbol: string; displaySymbol: string; market: string }) {
  const identity = `${input.symbol} ${input.displaySymbol} ${input.market}`;
  return /\.SR\b|\.SA\b|tadawul|saudi|السعودية|تداول/i.test(identity);
}

function quoteCandidates(input: { symbol: string; displaySymbol: string; name: string; market: string }) {
  const candidates: string[] = [];
  const aliases = [
    ...findAssetAliasMatches(input.symbol),
    ...findAssetAliasMatches(input.displaySymbol),
    ...findAssetAliasMatches(input.name),
  ];
  for (const alias of aliases) {
    for (const candidate of alias.symbolCandidates) addCandidate(candidates, candidate);
  }

  const symbolBase = baseEquitySymbol(input.symbol || input.displaySymbol);
  if (isKuwaitHolding(input) && symbolBase) {
    addCandidate(candidates, `${symbolBase}.KW`);
    addCandidate(candidates, `${symbolBase}:KSE`);
  }
  if (isSaudiHolding(input) && symbolBase) {
    addCandidate(candidates, `${symbolBase}.SR`);
    addCandidate(candidates, `${symbolBase}.SA`);
  }

  addCandidate(candidates, input.symbol);
  addCandidate(candidates, input.displaySymbol);
  return candidates;
}

export async function GET(request: NextRequest) {
  // Require authenticated user OR valid CRON_SECRET to prevent API key abuse
  const bearerToken = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();
  const isCron = cronSecret && bearerToken === cronSecret;
  if (!isCron) {
    const user = await getUserFromBearerToken(bearerToken);
    if (!user) {
      return NextResponse.json(
        { ok: false, code: 'UNAUTHORIZED', item: null },
        { status: 401, headers: noStoreHeaders },
      );
    }
  }

  const { searchParams } = request.nextUrl;
  const symbol = validateSymbol(searchParams.get('symbol') ?? searchParams.get('provider_symbol') ?? '');
  const displaySymbol = validateSymbol(searchParams.get('displaySymbol') ?? searchParams.get('display_symbol') ?? symbol ?? '');
  const name = String(searchParams.get('name') ?? symbol ?? '').trim().slice(0, 120);
  const market = String(searchParams.get('market') ?? '').trim().slice(0, 120);
  const requestedCurrency = String(searchParams.get('currency') ?? '').trim().slice(0, 12);
  const assetType = normalizeAssetType(searchParams.get('assetType') ?? searchParams.get('asset_type') ?? 'stock');

  if (!symbol) {
    return NextResponse.json({
      ok: false,
      code: 'INVALID_SYMBOL',
      item: null,
    }, { status: 400, headers: noStoreHeaders });
  }

  const symbols = quoteCandidates({
    symbol,
    displaySymbol: displaySymbol ?? symbol,
    name,
    market,
  });

  const quote = await fetchYahooNormalizedQuote({
    requestedSymbol: displaySymbol ?? symbol,
    symbols,
    name: name || symbol,
    forceFresh: true,
    debugContext: {
      route: '/api/market/refresh-investment-price',
      displaySymbol,
      requestedSymbol: symbol,
      symbolsTried: symbols,
      assetType,
    },
  });
  const resolvedCurrency = resolveMarketCurrency({
    providerCurrency: quote.currency ?? requestedCurrency,
    symbol: displaySymbol ?? symbol,
    providerSymbol: quote.symbolUsed ?? symbol,
    exchange: market,
    market,
    assetType,
  });
  const normalizedQuote = normalizeMarketPrice({
    price: quote.price,
    currency: resolvedCurrency.currency,
    providerCurrency: quote.currency,
    symbol: displaySymbol ?? symbol,
    providerSymbol: quote.symbolUsed ?? symbol,
    exchange: market,
    market,
    assetType,
  });
  const normalizedChange = normalizeMarketPrice({
    price: quote.change,
    currency: resolvedCurrency.currency,
    providerCurrency: quote.currency,
    symbol: displaySymbol ?? symbol,
    providerSymbol: quote.symbolUsed ?? symbol,
    exchange: market,
    market,
    assetType,
    priceUnit: normalizedQuote.priceUnit,
  }).price;

  if (process.env.NODE_ENV === 'development' || process.env.DEBUG_MARKET_DATA === 'true') {
    console.info('[Investments] refresh price provider result', {
      requestedSymbol: symbol,
      displaySymbol,
      symbolsTried: symbols,
      providerSymbol: quote.symbolUsed,
      providerStatus: quote.available ? 'available' : 'unavailable',
      parsedCurrentPrice: normalizedQuote.price,
      currency: resolvedCurrency.currency,
      lastUpdated: quote.marketTime,
      unavailableReason: quote.unavailableReason,
    });
  }

  if (!quote.available) {
    return NextResponse.json({
      ok: false,
      code: quote.unavailableReason ?? 'PRICE_UNAVAILABLE',
      item: {
        symbol: displaySymbol ?? symbol,
        provider_symbol: symbol,
        price: null,
        currency: resolvedCurrency.currency,
        currency_source: resolvedCurrency.source,
        price_unit: normalizedQuote.priceUnit,
        updated_at: quote.marketTime,
        source: quote.source,
      },
    }, { headers: noStoreHeaders });
  }

  return NextResponse.json({
    ok: true,
    item: {
      symbol: displaySymbol ?? symbol,
      provider_symbol: quote.symbolUsed ?? symbol,
      price: normalizedQuote.price,
      change: normalizedChange,
      change_percent: quote.changePercent,
      currency: resolvedCurrency.currency,
      currency_source: resolvedCurrency.source,
      price_unit: normalizedQuote.priceUnit,
      updated_at: quote.marketTime,
      source: quote.source,
      delayed: quote.delayed,
    },
  }, { headers: noStoreHeaders });
}
