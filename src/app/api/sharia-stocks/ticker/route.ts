import { NextResponse } from 'next/server';
import { fetchStockPrices } from '@/lib/market/fetchStockPrices';
import { SHARIAH_UNIVERSE } from '@/lib/market/shariahUniverse';
import { TICKER_FALLBACK_SOURCE, toResilientTickerItem } from '@/lib/market/tickerItems';
import { boubyanReferenceAvailability } from '@/lib/market/boubyanReference.server';
import { loadShariahPublicCatalog, shariahUniverseCatalogItem } from '@/lib/server/shariahPublicCatalog';
import { publicCatalogItem } from '@/lib/sharia-research/publicCatalog';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

export async function GET() {
  const now = new Date();
  const reference = boubyanReferenceAvailability(now);
  const [catalog, pricing] = await Promise.all([
    loadShariahPublicCatalog({ scope: 'universe', now }),
    fetchStockPrices(SHARIAH_UNIVERSE, process.env.FINNHUB_API_KEY)
      .then(prices => ({ prices, degraded: false }))
      .catch(() => ({ prices: undefined, degraded: true })),
  ]);
  const items = SHARIAH_UNIVERSE.map(asset => {
    const decision = shariahUniverseCatalogItem(asset.symbol, catalog.items, now)
      ?? publicCatalogItem({ symbol: asset.symbol, name: asset.name, asset_type: asset.assetType, sector: asset.sector }, now);
    return {
      ...toResilientTickerItem(asset, pricing.prices?.get(asset.symbol)),
      sector: asset.sector,
      industry: asset.industry,
      assetType: asset.assetType,
      exchange: decision.exchange,
      country: decision.country,
      providerSymbol: decision.providerSymbol,
      canonicalSecurityId: decision.canonicalSecurityId,
      shariahStatus: decision.shariahStatus,
      statusLabelAr: decision.statusLabelAr,
      screeningSource: decision.screeningSource,
      screeningMethodology: decision.methodology.en,
      lastScreenedAt: decision.lastScreenedAt,
      reason: decision.reason,
      publishedShariahReference: decision.publishedShariahReference,
      boubyanReferenceState: decision.boubyanReferenceState,
      boubyanReferenceReason: decision.boubyanReferenceReason,
      sourceConflict: decision.sourceConflict,
      independentScreening: decision.independentScreening,
      publishedShariahFund: decision.publishedShariahDesignation ?? decision.fundReview,
    };
  });
  const degraded = pricing.degraded || !catalog.storage.complete;
  return NextResponse.json({
    ok: true,
    ...(degraded ? { code: 'SHARIAH_TICKER_DEGRADED' } : {}),
    source: TICKER_FALLBACK_SOURCE,
    updated_at: now.toISOString(),
    screeningSourceConnected: reference.sourceAvailable || items.some(item => item.screeningSource !== null),
    screeningReference: reference,
    catalogStorage: catalog.storage,
    available_count: items.filter(item => item.available).length,
    items,
  }, {
    headers: { 'cache-control': degraded ? 'public, s-maxage=60, stale-while-revalidate=600' : 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}
