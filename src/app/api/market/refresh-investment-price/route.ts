import { NextRequest, NextResponse } from 'next/server';
import { fetchYahooNormalizedQuote } from '@/lib/market/fetchYahooQuote';
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
  const isKuwaitFils = quote.currency?.toUpperCase() === 'KWF' || symbol.endsWith('.KW');
  const normalizedPrice = quote.price === null ? null : isKuwaitFils ? quote.price / 1000 : quote.price;
  const normalizedChange = quote.change === null ? null : isKuwaitFils ? quote.change / 1000 : quote.change;
  const normalizedCurrency = isKuwaitFils ? 'KWD' : quote.currency;

  if (!quote.available) {
    return NextResponse.json({
      ok: false,
      code: quote.unavailableReason ?? 'PRICE_UNAVAILABLE',
      item: {
        symbol: displaySymbol ?? symbol,
        provider_symbol: symbol,
        price: null,
        currency: normalizedCurrency,
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
      price: normalizedPrice,
      change: normalizedChange,
      change_percent: quote.changePercent,
      currency: normalizedCurrency,
      updated_at: quote.marketTime,
      source: quote.source,
      delayed: quote.delayed,
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}
