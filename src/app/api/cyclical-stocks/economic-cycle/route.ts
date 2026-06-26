import { NextResponse } from 'next/server';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { getEconomicCycleIndicators } from '@/lib/market/economicCycleIndicators';

export const revalidate = 900;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { max: 45, prefix: 'cyclical-economic-cycle' });
  if (limited) return limited;

  const url = new URL(request.url);
  const countryParam = url.searchParams.get('country')?.trim();
  const country = countryParam && /^[\p{L}\s.-]{2,64}$/u.test(countryParam) ? countryParam : undefined;
  const result = await getEconomicCycleIndicators({
    country,
    force: url.searchParams.has('refresh'),
  });

  return NextResponse.json(result, {
    headers: {
      'cache-control': result.status === 'available'
        ? 'public, s-maxage=900, stale-while-revalidate=1800'
        : 'private, no-store',
    },
  });
}
