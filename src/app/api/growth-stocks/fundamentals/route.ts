import { NextResponse } from 'next/server';
import { loadGrowthFundamentalsBatch } from '@/lib/market/growthFundamentals';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { max: 40, windowMs: 60_000, prefix: 'growth-fundamentals' });
  if (limited) return limited;
  const symbols = [...new Set((new URL(request.url).searchParams.get('symbols') ?? '').split(',').map(s => s.trim().toUpperCase()))];
  if (!symbols.length || symbols.length > 6 || symbols.some(symbol => !/^[A-Z][A-Z0-9.-]{0,11}$/.test(symbol))) {
    return NextResponse.json({ ok: false, code: 'INVALID_SYMBOLS', items: [] }, { status: 400 });
  }
  const items = await loadGrowthFundamentalsBatch(symbols);
  const available = items.some(item => item.status !== 'unavailable');
  return NextResponse.json({ ok: true, items }, { headers: {
    'Cache-Control': available ? 'public, s-maxage=3600, stale-while-revalidate=3600' : 'public, s-maxage=60',
  } });
}
