import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { tvJson } from '@/lib/server/markets-tv/http';
import { loadTvSessionHistory } from '@/lib/server/markets-tv/history';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  const limited=rateLimitRequest(request,{prefix:'tv-history',max:20}); if(limited) return limited;
  // One fixed, verified cash index. No arbitrary provider URLs or symbols.
  return tvJson(await loadTvSessionHistory());
}
