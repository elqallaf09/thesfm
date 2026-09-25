import { tvMarkets } from '@/lib/server/markets-tv/catalog';
import { tvJson } from '@/lib/server/markets-tv/http';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { prefix: 'tv-catalog', max: 30 }); if (limited) return limited;
  try { return tvJson({ markets: await tvMarkets() }); }
  catch { return tvJson({ code: 'MARKET_UNAVAILABLE' }, 503); }
}
