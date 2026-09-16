import { NextResponse } from 'next/server';
import { loadEconomicContext } from '@/domain/economic-intelligence/economicContext.server';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

export const revalidate = 900;
export const dynamic = 'force-dynamic';

function validCountry(value: string | null) {
  const country = value?.trim();
  return country && /^[\p{L}\s.-]{2,64}$/u.test(country) ? country : undefined;
}

export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { max: 45, prefix: 'economic-intelligence-context' });
  if (limited) return limited;

  const url = new URL(request.url);
  const country = validCountry(url.searchParams.get('country')) ?? 'United States';
  const result = await loadEconomicContext(country, { force: url.searchParams.has('refresh') });

  return NextResponse.json(result, {
    headers: {
      'cache-control': result.context.status === 'empty'
        ? 'private, no-store'
        : 'public, s-maxage=900, stale-while-revalidate=1800',
    },
  });
}
