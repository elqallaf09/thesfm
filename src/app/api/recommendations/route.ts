import { NextResponse } from 'next/server';
import { CONNECTED_PROVIDER, fetchTraderQuotes, resolveTraderMarket } from '@/lib/trader/marketQuotes';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const market = resolveTraderMarket(url.searchParams.get('market'));
  const forceFresh = url.searchParams.has('refresh');

  const quotes = await fetchTraderQuotes(market.symbols, { forceFresh });
  const available = quotes.filter(q => q.available && q.price !== null);
  const unavailable = quotes
    .filter(q => !q.available)
    .map(q => ({ symbol: q.symbol, name: q.name, reason: q.unavailableReason ?? 'provider_returned_empty_quote' }));

  // Live prices plus rule-based technical signals (SMA20/50 + RSI-14) derived
  // from real Yahoo Finance history. Not financial advice.
  const recommendations = available.map(q => ({
    symbol: q.symbol,
    name: q.name,
    assetType: q.assetType,
    price: q.price,
    currentPrice: q.price,
    change: q.change,
    changePercent: q.changePercent,
    currency: q.currency,
    signal: q.signal,
    confidence: q.confidence,
    riskLevel: q.riskLevel,
    rsi: q.rsi,
    sma20: q.sma20,
    sma50: q.sma50,
    source: q.source,
    delayed: q.delayed,
    updatedAt: q.updatedAt,
  }));

  return NextResponse.json({
    market: market.id,
    recommendations,
    unavailable,
    smartAlerts: [],
    dataProvider: CONNECTED_PROVIDER,
    message: recommendations.length
      ? null
      : 'لم يُرجِع المزود أسعاراً حية لرموز هذا السوق حالياً.',
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
