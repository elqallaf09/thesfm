import { NextRequest, NextResponse } from 'next/server';
import { fetchYahooNormalizedQuote } from '@/lib/market/fetchYahooQuote';
import { normalizeMarketPrice, resolveMarketCurrency } from '@/lib/market/marketCurrency';
import { validateSymbol } from '@/lib/market/marketService';

export const revalidate = 300;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const symbol = validateSymbol(searchParams.get('symbol') ?? searchParams.get('provider_symbol') ?? '');
  const displaySymbol = validateSymbol(searchParams.get('displaySymbol') ?? searchParams.get('display_symbol') ?? symbol ?? '');
  const name = String(searchParams.get('name') ?? symbol ?? '').trim().slice(0, 120);

  if (!symbol) {
    return NextResponse.json({
      ok: false,
      code: 'INVALID_SYMBOL',
      item: null,
    }, { status: 400 });
  }

  const quote = await fetchYahooNormalizedQuote({
    requestedSymbol: displaySymbol ?? symbol,
    symbols: [symbol],
    name: name || symbol,
    debugContext: {
      route: '/api/market/refresh-investment-price',
      displaySymbol,
    },
  });
  const resolvedCurrency = resolveMarketCurrency({
    providerCurrency: quote.currency,
    symbol: displaySymbol ?? symbol,
    providerSymbol: quote.symbolUsed ?? symbol,
    assetType: 'stock',
  });
  const normalizedQuote = normalizeMarketPrice({
    price: quote.price,
    currency: resolvedCurrency.currency,
    providerCurrency: quote.currency,
    symbol: displaySymbol ?? symbol,
    providerSymbol: quote.symbolUsed ?? symbol,
    assetType: 'stock',
  });
  const normalizedChange = normalizeMarketPrice({
    price: quote.change,
    currency: resolvedCurrency.currency,
    providerCurrency: quote.currency,
    symbol: displaySymbol ?? symbol,
    providerSymbol: quote.symbolUsed ?? symbol,
    assetType: 'stock',
    priceUnit: normalizedQuote.priceUnit,
  }).price;

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
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
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
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}
