import { NextResponse } from 'next/server';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { fetchStockPrices, type TechStockPrice } from '@/lib/market/fetchStockPrices';
import type { GlobalMarketStripId } from '@/lib/market/globalMarketStrips';
import {
  parseRequestedStripIds,
  selectedStripSucceeded,
  symbolsForSelectedStrips,
} from '@/lib/market/marketStripSelection';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

export type MarketStripsResponse = {
  success: true;
  lastUpdated: string;
  requestedIds: GlobalMarketStripId[];
  strips: Array<{ id: GlobalMarketStripId; success: boolean }>;
  prices: Record<string, TechStockPrice>;
} | {
  success: false;
  error: string;
};

export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { max: 60, prefix: 'market-strips' });
  if (limited) return limited;

  try {
    let requestedIds: GlobalMarketStripId[];
    try {
      requestedIds = parseRequestedStripIds(new URL(request.url));
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'invalid_strip_ids' } satisfies MarketStripsResponse,
        { status: 400 },
      );
    }
    const apiKey = process.env.FINNHUB_API_KEY?.trim();
    const symbols = symbolsForSelectedStrips(requestedIds);
    const priceMap = await Promise.race([
      fetchStockPrices(symbols.map(symbol => ({ symbol })), apiKey),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('provider_timeout')), 12_000)),
    ]);

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
    const availableSymbols = new Set(symbols.filter(symbol => prices[symbol]?.available));

    return NextResponse.json({
      success: true,
      lastUpdated: new Date().toISOString(),
      requestedIds,
      strips: requestedIds.map(id => ({ id, success: selectedStripSucceeded(id, availableSymbols) })),
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
