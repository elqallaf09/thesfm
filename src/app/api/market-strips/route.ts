import { NextResponse } from 'next/server';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { fetchStockPrices, type TechStockPrice } from '@/lib/market/fetchStockPrices';
import { allGlobalMarketStripSymbols } from '@/lib/market/globalMarketStrips';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

export type MarketStripsResponse = {
  success: true;
  lastUpdated: string;
  prices: Record<string, TechStockPrice>;
} | {
  success: false;
  error: string;
};

export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { max: 60, prefix: 'market-strips' });
  if (limited) return limited;

  try {
    const apiKey = process.env.FINNHUB_API_KEY?.trim();
    const symbols = allGlobalMarketStripSymbols();
    const priceMap = await fetchStockPrices(symbols.map(symbol => ({ symbol })), apiKey);

    const prices: Record<string, TechStockPrice> = {};
    for (const symbol of symbols) {
      const price = priceMap.get(symbol);
      prices[symbol] = price ?? {
        symbol,
        price: null,
        change: null,
        changePercent: null,
        source: 'Finnhub',
        delayed: true,
        available: false,
        unavailableReason: 'price_not_fetched',
      };
    }

    return NextResponse.json({
      success: true,
      lastUpdated: new Date().toISOString(),
      prices,
    } satisfies MarketStripsResponse, {
      headers: { 'cache-control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('[MarketStrips] Failed to load global market strip quotes', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: 'provider_temporarily_unavailable' } satisfies MarketStripsResponse,
      { status: 503 },
    );
  }
}
