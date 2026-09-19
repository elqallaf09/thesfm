import { TV_GROUPS, type TvGroup } from '@/lib/markets-tv/types';
import { getTvDevice, ownedTvData } from '@/lib/server/markets-tv/devices';
import { loadTvSnapshot } from '@/lib/server/markets-tv/snapshot';
import { tvJson } from '@/lib/server/markets-tv/http';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { prefix: 'tv-snapshot', max: 30 }); if (limited) return limited;
  const params = new URL(request.url).searchParams;
  const group = params.get('group') || 'global';
  const page = Number(params.get('page') || 0), pageSize = Number(params.get('pageSize') || 6);
  const market = params.get('market') || undefined;
  if (!Number.isInteger(page) || page < 0 || page > 1_000_000 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 12 || market && !/^[A-Z_a-z0-9]{1,32}$/.test(market)) return tvJson({ code: 'INVALID_QUERY' }, 400);
  if (!TV_GROUPS.includes(group as TvGroup)) return tvJson({ code: 'INVALID_GROUP' }, 400);
  try {
    let symbols: string[] = [];
    if (group === 'watchlist') {
      const device = await getTvDevice(request);
      if (!device?.user_id) return tvJson({ code: 'UNAUTHORIZED' }, 401);
      symbols = (await ownedTvData(device.user_id)).symbols;
    }
    return tvJson(await loadTvSnapshot(group as TvGroup, symbols, { page, pageSize, market }));
  } catch { return tvJson({ code: 'MARKET_UNAVAILABLE' }, 503); }
}
