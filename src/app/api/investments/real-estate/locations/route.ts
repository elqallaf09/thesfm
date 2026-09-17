import { NextRequest, NextResponse } from 'next/server';
import { getUserFromBearerToken } from '@/lib/server/adminAccess';
import { checkRateLimitWithMetadata } from '@/lib/server/rateLimiter';
import { getQatarPropertyLocations } from '@/lib/investments/intelligence/adapters/qatar-open-data';

export const runtime = 'nodejs';
export const maxDuration = 60;
const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache', Vary: 'Authorization' };
const reply = (body: unknown, status = 200, extra: Record<string, string> = {}) => NextResponse.json(body, { status, headers: { ...PRIVATE_HEADERS, ...extra } });

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    const user = token ? await getUserFromBearerToken(token) : null;
    if (!user?.id) return reply({ ok: false, code: 'UNAUTHORIZED' }, 401);
    if (request.nextUrl.searchParams.get('countryCode') !== 'QA') return reply({ ok: false, code: 'LOCATION_SOURCE_NOT_CONNECTED' }, 422);
    const rate = checkRateLimitWithMetadata(user.id, { max: 12, windowMs: 60_000, prefix: 'property-locations' });
    if (!rate.allowed) return reply({ ok: false, code: 'RATE_LIMITED' }, 429, { 'Retry-After': String(rate.retryAfterSeconds) });
    const locations = await getQatarPropertyLocations();
    return reply({ ok: true, countryCode: 'QA', locations, valuationEligible: false });
  } catch { return reply({ ok: false, code: 'LOCATION_SOURCE_UNAVAILABLE' }, 503); }
}
