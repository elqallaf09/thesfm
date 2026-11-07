import { getTvDevice } from '@/lib/server/markets-tv/devices';
import { ownedTvPortfolio } from '@/lib/server/markets-tv/portfolio';
import { tvJson } from '@/lib/server/markets-tv/http';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const limit = rateLimitRequest(request, { prefix: 'tv-portfolio', max: 30 });
  if (limit) return limit;
  try {
    const device = await getTvDevice(request);
    if (!device?.user_id) return tvJson({ code: 'UNAUTHORIZED' }, 401);
    if (!device.portfolio_consent_at) return tvJson({ code: 'PORTFOLIO_CONSENT_REQUIRED' }, 403);
    const params = new URL(request.url).searchParams;
    const currency = params.get('currency');
    if ([...params.keys()].some(key => key !== 'currency') || (currency !== null && !/^[A-Z]{3}$/.test(currency))) return tvJson({ code: 'INVALID_REQUEST' }, 400);
    const portfolio = await ownedTvPortfolio(device.user_id, currency);
    // Discard data if the credential expired, rotated or was revoked during the read.
    const current = await getTvDevice(request);
    if (!current || current.id !== device.id || current.user_id !== device.user_id) {
      return tvJson({ code: 'UNAUTHORIZED' }, 401);
    }
    if (!current.portfolio_consent_at) return tvJson({ code: 'PORTFOLIO_CONSENT_REQUIRED' }, 403);
    return tvJson(portfolio);
  } catch { return tvJson({ code: 'PORTFOLIO_UNAVAILABLE' }, 503); }
}
