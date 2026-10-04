import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { NextResponse } from 'next/server';
import { fetchStockCategoryNews, type StockCategoryNewsItem } from '@/lib/market/fetchStockCategoryNews';
import { compactNewsItem, parseNewsLimit } from '@/lib/news/apiPayload';
import { SHARIAH_UNIVERSE } from '@/lib/market/shariahUniverse';
import { normalizeBoubyanCompanyName, normalizeBoubyanExchange } from '@/lib/market/boubyanReference';
import { boubyanReferenceAvailability } from '@/lib/market/boubyanReference.server';
import { shariahUniverseIdentity } from '@/lib/market/shariahUniverseIdentity';
import { loadShariahPublicCatalog, shariahUniverseCatalogItem } from '@/lib/server/shariahPublicCatalog';

export const revalidate = 300;
export const dynamic = 'force-dynamic';
const universeBySymbol = new Map(SHARIAH_UNIVERSE.map(item => [item.symbol, item]));

function newsHasKnownIdentity(item: StockCategoryNewsItem) {
  const symbol = item.ticker.toUpperCase();
  const universe = universeBySymbol.get(symbol);
  const identity = shariahUniverseIdentity(symbol);
  if (!universe || !identity) return false;
  const name = normalizeBoubyanCompanyName(item.companyName);
  if (![universe.name, identity.name, ...(universe.aliases ?? [])].some(value => normalizeBoubyanCompanyName(value) === name)) return false;
  const reportedVenues = (item.exchangeCodes ?? []).map(normalizeBoubyanExchange).filter(Boolean);
  return !reportedVenues.length || reportedVenues.includes(normalizeBoubyanExchange(identity.exchange));
}

export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { max: 60, prefix: 'sharia-news' });
  if (limited) return limited;
  const now = new Date();
  const reference = boubyanReferenceAvailability(now);
  try {
    const url = new URL(request.url);
    const limit = parseNewsLimit(url.searchParams.get('limit'));
    const [payload, catalog] = await Promise.all([
      fetchStockCategoryNews('sharia', url.searchParams.get('lang')),
      loadShariahPublicCatalog({ scope: 'universe', now }),
    ]);
    const items = payload.items.slice(0, limit).map(item => {
      const decision = newsHasKnownIdentity(item) ? shariahUniverseCatalogItem(item.ticker, catalog.items, now) : null;
      return {
        ...compactNewsItem(item),
        companyName: item.companyName,
        ticker: item.ticker,
        sector: item.sector,
        sectors: item.sectors,
        price: item.price,
        change: item.change,
        changePercent: item.changePercent,
        priceSource: item.priceSource,
        delayed: item.delayed,
        exchange: decision?.exchange ?? null,
        country: decision?.country ?? null,
        providerSymbol: decision?.providerSymbol ?? null,
        canonicalSecurityId: decision?.canonicalSecurityId ?? null,
        shariahStatus: decision?.shariahStatus ?? 'unclassified',
        screeningSource: decision?.screeningSource ?? null,
        publishedShariahReference: decision?.publishedShariahReference ?? null,
        boubyanReferenceState: decision?.boubyanReferenceState ?? null,
        boubyanReferenceReason: decision?.boubyanReferenceReason ?? null,
        sourceConflict: decision?.sourceConflict ?? null,
      };
    });
    return NextResponse.json({
      ...payload,
      limit,
      screeningSourceConnected: reference.sourceAvailable || items.some(item => item.screeningSource !== null),
      screeningReference: reference,
      catalogStorage: catalog.storage,
      items,
    }, {
      headers: { 'cache-control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch {
    return NextResponse.json({
      success: false,
      error: 'provider_temporarily_unavailable',
      reason: 'provider_temporarily_unavailable',
      screeningSourceConnected: reference.sourceAvailable,
      screeningReference: reference,
    }, { status: 503 });
  }
}
