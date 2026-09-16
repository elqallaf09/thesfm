import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { checkRateLimitWithMetadata } from '@/lib/server/rateLimiter';
import { loadProactiveEconomicEvents } from '@/domain/economic-intelligence/proactive.server';
import { loadCrossWorkspaceEconomicEvents } from '@/domain/economic-intelligence/crossWorkspaceEvents.server';
import { loadFreshnessEconomicEvents } from '@/domain/economic-intelligence/freshnessEvents.server';
import type { NotificationLang } from '@/lib/notifications/generateNotifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'cache-control': 'private, no-store' };

function normalizeLang(value: string | null): NotificationLang {
  return value === 'fr' ? 'fr' : value === 'en' ? 'en' : 'ar';
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request).catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: NO_STORE });

  const limit = checkRateLimitWithMetadata(`user:${user.id}`, {
    max: 20,
    windowMs: 60_000,
    prefix: 'economic-intelligence-proactive-events',
  });
  if (!limit.allowed) {
    return NextResponse.json({ ok: false, error: { code: 'APPLICATION_RATE_LIMITED' } }, {
      status: 429,
      headers: { ...NO_STORE, 'Retry-After': String(Math.max(1, limit.retryAfterSeconds ?? 60)) },
    });
  }

  try {
    const lang = normalizeLang(new URL(request.url).searchParams.get('lang'));
    const [personalEvents, crossWorkspaceEvents, freshnessEvents] = await Promise.all([
      loadProactiveEconomicEvents(user.id, lang),
      loadCrossWorkspaceEconomicEvents(user.id, lang).catch(() => []),
      loadFreshnessEconomicEvents(user.id, lang).catch(() => []),
    ]);
    const byId = new Map([...personalEvents, ...crossWorkspaceEvents, ...freshnessEvents].map(event => [event.id, event]));
    const events = Array.from(byId.values());
    return NextResponse.json({ ok: true, events }, { headers: NO_STORE });
  } catch (error) {
    const code = error instanceof Error && error.message === 'ECONOMIC_INTELLIGENCE_SERVER_NOT_CONFIGURED'
      ? 'SERVICE_NOT_CONFIGURED'
      : 'PROACTIVE_EVENTS_UNAVAILABLE';
    return NextResponse.json({ ok: false, error: { code } }, { status: code === 'SERVICE_NOT_CONFIGURED' ? 503 : 502, headers: NO_STORE });
  }
}
