import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { checkRateLimitWithMetadata } from '@/lib/server/rateLimiter';
import { loadEconomicIntelligenceReadiness } from '@/domain/economic-intelligence/readiness.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request).catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: { code: 'UNAUTHENTICATED' } }, { status: 401 });

  const limit = checkRateLimitWithMetadata(`user:${user.id}`, { max: 30, windowMs: 60_000, prefix: 'economic-intelligence-readiness' });
  if (!limit.allowed) return NextResponse.json({ ok: false, error: { code: 'APPLICATION_RATE_LIMITED' } }, { status: 429 });

  try {
    const readiness = await loadEconomicIntelligenceReadiness(user.id);
    return NextResponse.json({ ok: true, readiness }, { headers: { 'cache-control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ ok: false, error: { code: 'READINESS_UNAVAILABLE' } }, { status: 502 });
  }
}
