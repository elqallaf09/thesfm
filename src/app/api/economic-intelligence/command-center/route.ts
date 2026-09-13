import { NextRequest, NextResponse } from 'next/server';
import { buildEconomicCommandCenter } from '@/domain/economic-intelligence/commandCenter';
import { loadAdvisorGrounding } from '@/domain/economic-intelligence/advisors.server';
import { getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { checkRateLimitWithMetadata } from '@/lib/server/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request).catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: { code: 'UNAUTHENTICATED' } }, { status: 401 });

  const limit = checkRateLimitWithMetadata(`user:${user.id}`, {
    max: 20,
    windowMs: 60_000,
    prefix: 'economic-intelligence-command-center',
  });
  if (!limit.allowed) {
    return NextResponse.json({ ok: false, error: { code: 'APPLICATION_RATE_LIMITED' } }, {
      status: 429,
      headers: { 'Retry-After': String(Math.max(1, limit.retryAfterSeconds ?? 60)) },
    });
  }

  try {
    const groundings = await Promise.all([
      loadAdvisorGrounding({ userId: user.id, advisor: 'finance' }),
      loadAdvisorGrounding({ userId: user.id, advisor: 'investment', hasMarketEvidence: false }),
      loadAdvisorGrounding({ userId: user.id, advisor: 'business' }),
    ]);

    return NextResponse.json({
      ok: true,
      commandCenter: buildEconomicCommandCenter(groundings),
    }, { headers: { 'cache-control': 'private, no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const code = message === 'ECONOMIC_INTELLIGENCE_SERVER_NOT_CONFIGURED'
      ? 'SERVICE_NOT_CONFIGURED'
      : message === 'ECONOMIC_INTELLIGENCE_CURRENCY_NOT_CONFIGURED'
        ? 'CURRENCY_NOT_CONFIGURED'
        : 'COMMAND_CENTER_UNAVAILABLE';
    return NextResponse.json({ ok: false, error: { code } }, { status: code === 'COMMAND_CENTER_UNAVAILABLE' ? 502 : 503 });
  }
}
