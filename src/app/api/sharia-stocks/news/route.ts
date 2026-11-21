import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { after, NextResponse } from 'next/server';
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
  const knownNames = [universe.name, identity.name, ...(universe.aliases ?? [])].map(normalizeBoubyanCompanyName);
  const names = item.reportedCompanyNames ?? [item.companyName];
  if (!names.some(name => knownNames.includes(normalizeBoubyanCompanyName(name)))) return false;
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
    const compliantOnly = url.searchParams.get('scope') === 'compliant';
    const catalog = await loadShariahPublicCatalog({ scope: 'universe', now });
    const screenedSymbols = compliantOnly ? new Set(SHARIAH_UNIVERSE.filter(asset => asset.assetType === 'stock'
      && shariahUniverseCatalogItem(asset.symbol, catalog.items, now)?.shariahStatus === 'compliant').map(asset => asset.symbol)) : undefined;
    const payload = await fetchStockCategoryNews('sharia', url.searchParams.get('lang'), {
      headlinesOnly: url.searchParams.get('view') === 'headlines', screenedSymbols, schedulePersistence: task => after(task),
    });
    const items = payload.items.map(item => {
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
    }).filter(item => !screenedSymbols || (screenedSymbols.has(item.ticker) && item.shariahStatus === 'compliant')).slice(0, limit);
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
