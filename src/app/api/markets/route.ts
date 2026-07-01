import { NextResponse } from 'next/server';
import { CONNECTED_PROVIDER, TRADER_MARKETS } from '@/lib/trader/marketQuotes';

export const dynamic = 'force-dynamic';

// Static market directory (name / symbol / currency / source). Live prices are
// served per-market by /api/recommendations to keep this listing fast.
export async function GET() {
  const markets = TRADER_MARKETS.flatMap(market =>
    market.symbols.map(symbol => ({
      market: market.id,
      marketName: market.en,
      name: market.en,
      label: market.ar,
      symbol,
      currency: market.currency,
      source: 'Yahoo Finance',
    })),
  );

  return NextResponse.json({
    markets,
    dataProvider: CONNECTED_PROVIDER,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
