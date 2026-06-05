import { NextResponse } from 'next/server';
import { fetchStockPrices, type TechStockPrice } from '@/lib/market/fetchStockPrices';
import {
  buildUnknownShariahScreening,
  SHARIAH_UNIVERSE,
  shariahStatusLabelAr,
} from '@/lib/market/shariahUniverse';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

function isUsableMarketPrice(price: TechStockPrice | undefined): price is TechStockPrice & { price: number } {
  return Boolean(price?.available && price.price !== null && Number.isFinite(price.price) && price.price > 0 && price.source);
}

export async function GET() {
  try {
    const prices = await fetchStockPrices(SHARIAH_UNIVERSE, process.env.FINNHUB_API_KEY);
    const items = SHARIAH_UNIVERSE
      .map(asset => {
        const price = prices.get(asset.symbol);
        if (!isUsableMarketPrice(price)) return null;
        const screening = buildUnknownShariahScreening(asset);
        return {
          symbol: asset.symbol,
          name: asset.name,
          sector: asset.sector,
          industry: asset.industry,
          assetType: asset.assetType,
          price: price.price,
          currency: 'USD',
          change: price.change,
          changePercent: price.changePercent,
          source: price.source,
          delayed: price.delayed,
          shariahStatus: screening.shariahStatus,
          statusLabelAr: shariahStatusLabelAr(screening.shariahStatus),
          screeningSource: screening.screeningSource,
          screeningMethodology: screening.methodology,
          lastScreenedAt: screening.lastScreenedAt,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (items.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          code: 'SHARIAH_TICKER_UNAVAILABLE',
          updated_at: null,
          source: 'Finnhub/Yahoo Finance fallback',
          screeningSourceConnected: false,
          items: [],
        },
        {
          headers: {
            'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        source: 'Finnhub/Yahoo Finance fallback',
        updated_at: new Date().toISOString(),
        screeningSourceConnected: false,
        items,
      },
      {
        headers: {
          'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch (error) {
    console.error('[ShariahStocksTicker] Failed to load ticker', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        ok: false,
        code: 'SHARIAH_TICKER_UNAVAILABLE',
        updated_at: null,
        source: 'Finnhub/Yahoo Finance fallback',
        screeningSourceConnected: false,
        items: [],
      },
      { status: 503 },
    );
  }
}
