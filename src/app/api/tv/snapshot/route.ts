import { TV_GROUPS, type TvGroup } from '@/lib/markets-tv/types';
import { getTvDevice, ownedTvData } from '@/lib/server/markets-tv/devices';
import { loadTvSnapshot } from '@/lib/server/markets-tv/snapshot';
import { tvJson } from '@/lib/server/markets-tv/http';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { prefix: 'tv-snapshot', max: 30 }); if (limited) return limited;
  const group = new URL(request.url).searchParams.get('group') || 'global';
  if (!TV_GROUPS.includes(group as TvGroup)) return tvJson({ code: 'INVALID_GROUP' }, 400);
  try {
    let symbols: string[] = [];
    if (group === 'watchlist') {
      const device = await getTvDevice(request);
      if (!device?.user_id) return tvJson({ code: 'UNAUTHORIZED' }, 401);
      symbols = (await ownedTvData(device.user_id)).symbols;
    }
    return tvJson(await loadTvSnapshot(group as TvGroup, symbols));
  } catch { return tvJson({ code: 'MARKET_UNAVAILABLE' }, 503); }
}
