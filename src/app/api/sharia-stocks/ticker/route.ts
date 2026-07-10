import { NextResponse } from 'next/server';
import { fetchStockPrices } from '@/lib/market/fetchStockPrices';
import {
  buildUnknownShariahScreening,
  SHARIAH_UNIVERSE,
  shariahStatusLabelAr,
} from '@/lib/market/shariahUniverse';
import { TICKER_FALLBACK_SOURCE, toResilientTickerItem } from '@/lib/market/tickerItems';
import { loadSecCompanyDirectory } from '@/lib/sharia-research/secData';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

export async function GET() {
  const buildItems = (
    prices?: Awaited<ReturnType<typeof fetchStockPrices>>,
    exchanges = new Map<string, string>(),
  ) =>
    SHARIAH_UNIVERSE.map(asset => {
      const screening = buildUnknownShariahScreening(asset);
      return {
        ...toResilientTickerItem(asset, prices?.get(asset.symbol)),
        sector: asset.sector,
        industry: asset.industry,
        assetType: asset.assetType,
        exchange: exchanges.get(asset.symbol.toUpperCase()) ?? null,
        shariahStatus: screening.shariahStatus,
        statusLabelAr: shariahStatusLabelAr(screening.shariahStatus),
        screeningSource: screening.screeningSource,
        screeningMethodology: screening.methodology,
        lastScreenedAt: screening.lastScreenedAt,
      };
    });

  try {
    const [prices, directory] = await Promise.all([
      fetchStockPrices(SHARIAH_UNIVERSE, process.env.FINNHUB_API_KEY),
      loadSecCompanyDirectory().catch(() => []),
    ]);
    const exchanges = new Map(directory.map(item => [item.ticker.toUpperCase(), item.exchange]));
    // Always return every screened asset; missing quotes are flagged unavailable.
    const items = buildItems(prices, exchanges);

    return NextResponse.json(
      {
        ok: true,
        source: TICKER_FALLBACK_SOURCE,
        updated_at: new Date().toISOString(),
        screeningSourceConnected: false,
        available_count: items.filter(item => item.available).length,
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
        ok: true,
        code: 'SHARIAH_TICKER_DEGRADED',
        source: TICKER_FALLBACK_SOURCE,
        updated_at: new Date().toISOString(),
        screeningSourceConnected: false,
        available_count: 0,
        items: buildItems(),
      },
      {
        headers: {
          'cache-control': 'public, s-maxage=60, stale-while-revalidate=600',
        },
      },
    );
  }
}
