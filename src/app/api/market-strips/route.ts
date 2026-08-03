import { NextResponse } from 'next/server';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { fetchStockPrices, type TechStockPrice } from '@/lib/market/fetchStockPrices';
import {
  GLOBAL_MARKET_STRIPS,
  type GlobalMarketStripId,
} from '@/lib/market/globalMarketStrips';

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

const MARKET_STRIP_BY_ID = new Map(GLOBAL_MARKET_STRIPS.map(strip => [strip.id, strip]));
const MAX_SELECTED_STRIPS = 4;

export function parseRequestedStripIds(url: URL): GlobalMarketStripId[] {
  const candidates = url.searchParams.getAll('ids').flatMap(value => value.split(','));
  const normalized = [...new Set(candidates.map(value => value.trim()).filter(Boolean))];
  if (normalized.length < 1 || normalized.length > MAX_SELECTED_STRIPS) {
    throw new Error('invalid_strip_count');
  }
  if (normalized.some(id => !MARKET_STRIP_BY_ID.has(id as GlobalMarketStripId))) {
    throw new Error('unknown_strip_id');
  }
  if (normalized.some(id => MARKET_STRIP_BY_ID.get(id as GlobalMarketStripId)?.items.length === 0)) {
    throw new Error('strip_coverage_unavailable');
  }
  return normalized as GlobalMarketStripId[];
}

export function symbolsForSelectedStrips(ids: GlobalMarketStripId[]): string[] {
  return [...new Set(ids.flatMap(id => MARKET_STRIP_BY_ID.get(id)?.items.map(item => item.symbol) ?? []))];
}

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

    return NextResponse.json({
      success: true,
      lastUpdated: new Date().toISOString(),
      requestedIds,
      strips: requestedIds.map(id => ({
        id,
        success: (MARKET_STRIP_BY_ID.get(id)?.items ?? []).some(item => prices[item.symbol]?.available),
      })),
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
