import { TV_GROUPS, type TvGroup } from '@/lib/markets-tv/types';
import { tvDirectory } from '@/lib/server/markets-tv/catalog';
import { tvListingKey } from '@/lib/markets-tv/listingIdentity';
import { tvJson } from '@/lib/server/markets-tv/http';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { normalizeAssetSearchText } from '@/lib/market/assetAliases';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { prefix: 'tv-instruments', max: 60 }); if (limited) return limited;
  const params = new URL(request.url).searchParams;
  const group = params.get('group') as TvGroup, market = params.get('market') || '';
  const query = params.get('q') || '', page = Number(params.get('page') || 0), pageSize = Number(params.get('pageSize') || 50);
  if (!TV_GROUPS.includes(group) || group === 'watchlist' || (market ? !/^[A-Za-z0-9_]{1,32}$/.test(market) : group !== 'world') || query.length > 120 || !Number.isInteger(page) || page < 0 || page > 1000000 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) return tvJson({ code: 'INVALID_QUERY' }, 400);
  try {
    const { assets: all, ...coverage } = await tvDirectory(group, market), needle = normalizeAssetSearchText(query);
    const matching = needle ? all.filter(a => normalizeAssetSearchText(`${a.symbol} ${a.name} ${a.nameAr || ''}`).includes(needle)) : all;
    return tvJson({ items: matching.slice(page * pageSize, (page + 1) * pageSize).map(asset => {
      const { symbol, name, nameAr, currency, region, displaySymbol } = asset;
      return { symbol, name, nameAr, currency, region, displaySymbol, listingKey: tvListingKey(asset) };
    }), total: matching.length, directoryTotal: all.length, page, pageSize, ...coverage });
  } catch { return tvJson({ code: 'MARKET_UNAVAILABLE' }, 503); }
}
