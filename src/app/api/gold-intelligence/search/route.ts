import { NextRequest, NextResponse } from 'next/server';
import { searchGoldResearch, type GoldResearchKind } from '@/lib/gold-intelligence/search';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function integer(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.trunc(parsed))) : fallback;
}

export async function GET(request: NextRequest) {
  const limited = rateLimitRequest(request, { max: 30, windowMs: 60_000, prefix: 'gold-research-search' });
  if (limited) return limited;

  const query = request.nextUrl.searchParams.get('q') ?? '';
  const rawKind = request.nextUrl.searchParams.get('kind') ?? 'all';
  const kind: GoldResearchKind = rawKind === 'news' || rawKind === 'calendar' ? rawKind : 'all';
  const officialOnly = request.nextUrl.searchParams.get('official') === '1';
  const days = integer(request.nextUrl.searchParams.get('days'), 7, 1, 30);
  const limit = integer(request.nextUrl.searchParams.get('limit'), 20, 5, 40);

  if (query.trim().length < 2 || query.length > 180) {
    return NextResponse.json({ success: false, code: 'INVALID_QUERY' }, {
      status: 400,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  try {
    const result = await searchGoldResearch({ query, days, kind, officialOnly, limit });
    return NextResponse.json({ success: true, result }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('[GoldResearchSearch] failed', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({
      success: false,
      code: 'GOLD_RESEARCH_SEARCH_UNAVAILABLE',
    }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
