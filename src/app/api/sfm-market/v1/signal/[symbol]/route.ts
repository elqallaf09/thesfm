import { NextRequest, NextResponse } from 'next/server';
import { generateSfmTraderSignal } from '@/lib/sfm-market/traderSignals';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ symbol: string }>;
};

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      'Cache-Control': 'public, max-age=10, s-maxage=30, stale-while-revalidate=60',
      'X-SFM-Market-Source': 'THE SFM Market Data Engine',
      ...(init?.headers ?? {}),
    },
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { symbol } = await context.params;
  const decodedSymbol = decodeURIComponent(symbol ?? '').trim().toUpperCase();
  if (!decodedSymbol) {
    return json({ ok: false, code: 'INVALID_SYMBOL', message: 'Symbol is required.' }, { status: 400 });
  }

  const signal = await generateSfmTraderSignal(decodedSymbol, {
    market: request.nextUrl.searchParams.get('market'),
    assetType: request.nextUrl.searchParams.get('assetType'),
    forceFresh: request.nextUrl.searchParams.get('refresh') === '1'
      || request.nextUrl.searchParams.get('refresh') === 'true',
  });

  const usable = signal.available && signal.price !== null;
  return json({
    ok: usable,
    source: 'sfm-market-data-engine',
    signal,
    item: signal,
    quote: {
      symbol: signal.symbol,
      name: signal.assetName,
      assetType: signal.assetType,
      market: signal.market,
      currency: signal.currency,
      price: signal.price,
      currentPrice: signal.currentPrice,
      change: signal.change,
      changePercent: signal.changePercent,
      previousClose: signal.previousClose,
      volume: signal.volume,
      open: signal.open,
      high: signal.high,
      low: signal.low,
      provider: 'THE SFM',
      source: 'THE SFM',
      dataQuality: signal.dataQuality,
      lastUpdated: signal.lastUpdated,
      history: signal.history,
      sparkline: signal.sparkline,
      chartAvailable: signal.chartAvailable,
      sfmMarket: signal.sfmMarket,
    },
    technical: signal.technicalSummary,
    history: signal.history,
    points: signal.history,
  }, { status: usable ? 200 : 503 });
}
