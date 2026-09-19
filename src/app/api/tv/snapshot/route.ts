import { TV_GROUPS, type TvGroup } from '@/lib/markets-tv/types';
import { getTvDevice, ownedTvData } from '@/lib/server/markets-tv/devices';
import { loadTvSnapshot } from '@/lib/server/markets-tv/snapshot';
import { tvJson } from '@/lib/server/markets-tv/http';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { validTvSymbol } from '@/lib/markets-tv/selections';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const group = params.get('group') || 'global';
  // A 4K display can have 16 visible rows polling at 15–30 seconds.
  // Keep the device-owned watchlist on the tighter private budget.
  const limited = rateLimitRequest(request, { prefix: 'tv-snapshot', max: group === 'watchlist' ? 30 : 120 }); if (limited) return limited;
  const page = Number(params.get('page') || 0), pageSize = Number(params.get('pageSize') || 6);
  const market = params.get('market') || undefined;
  if (!Number.isInteger(page) || page < 0 || page > 1_000_000 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 12 || market && !/^[A-Z_a-z0-9]{1,32}$/.test(market)) return tvJson({ code: 'INVALID_QUERY' }, 400);
  if (!TV_GROUPS.includes(group as TvGroup)) return tvJson({ code: 'INVALID_GROUP' }, 400);
  let selected: string[] | undefined;
  if (params.has('symbols')) {
    try {
      const raw = params.get('symbols')!;
      if (raw.length > 1024 || !market || group === 'watchlist') throw new Error();
      const values: unknown = JSON.parse(raw);
      if (!Array.isArray(values) || !values.length || values.length > 12 || !values.every(validTvSymbol)) throw new Error();
      selected = [...new Set(values)];
    } catch { return tvJson({ code: 'INVALID_QUERY' }, 400); }
  }
  try {
    let symbols: string[] = [];
    if (group === 'watchlist') {
      const device = await getTvDevice(request);
      if (!device?.user_id) return tvJson({ code: 'UNAUTHORIZED' }, 401);
      symbols = (await ownedTvData(device.user_id)).symbols;
    }
    return tvJson(await loadTvSnapshot(group as TvGroup, symbols, { page, pageSize, market, symbols: selected }));
  } catch { return tvJson({ code: 'MARKET_UNAVAILABLE' }, 503); }
}
