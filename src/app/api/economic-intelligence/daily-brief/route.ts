import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { checkRateLimitWithMetadata } from '@/lib/server/rateLimiter';
import { loadCrossWorkspaceBrief } from '@/domain/economic-intelligence/crossWorkspaceBrain.server';
import { buildDailyPriorityActions, highestDailyPriority } from '@/domain/economic-intelligence/dailyPriority';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request).catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: { code: 'UNAUTHENTICATED' } }, { status: 401 });

  const limit = checkRateLimitWithMetadata(`user:${user.id}`, { max: 30, windowMs: 60_000, prefix: 'economic-daily-brief' });
  if (!limit.allowed) return NextResponse.json({ ok: false, error: { code: 'APPLICATION_RATE_LIMITED' } }, { status: 429 });

  try {
    const brief = await loadCrossWorkspaceBrief(user.id);
    const actions = buildDailyPriorityActions(brief);
    const highestPriority = highestDailyPriority(brief);
    return NextResponse.json({ ok: true, brief, actions, highestPriority }, { headers: { 'cache-control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ ok: false, error: { code: 'DAILY_BRIEF_UNAVAILABLE' } }, { status: 502 });
  }
}
