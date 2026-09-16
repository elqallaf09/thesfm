import { NextRequest, NextResponse } from 'next/server';
import { loadAdvisorGrounding } from '@/domain/economic-intelligence/advisors.server';
import type { EconomicAdvisorId } from '@/domain/economic-intelligence/advisors';
import { getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { checkRateLimitWithMetadata } from '@/lib/server/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADVISORS = new Set<EconomicAdvisorId>(['finance', 'investment', 'business']);
const NO_STORE = { 'cache-control': 'private, no-store' };

function normalizeAdvisor(value: string | null): EconomicAdvisorId | null {
  return value && ADVISORS.has(value as EconomicAdvisorId) ? value as EconomicAdvisorId : null;
}

function normalizeCurrency(value: string | null) {
  const currency = value?.trim().toUpperCase() ?? '';
  return /^[A-Z]{3}$/.test(currency) ? currency : null;
}

function normalizeCountry(value: string | null) {
  const country = value?.trim() ?? '';
  return country && /^[\p{L}\s.-]{2,64}$/u.test(country) ? country : null;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request).catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: NO_STORE });

  const limit = checkRateLimitWithMetadata(`user:${user.id}`, {
    max: 30,
    windowMs: 60_000,
    prefix: 'economic-intelligence-advisor-grounding',
  });
  if (!limit.allowed) {
    return NextResponse.json({ ok: false, error: { code: 'APPLICATION_RATE_LIMITED' } }, {
      status: 429,
      headers: { ...NO_STORE, 'Retry-After': String(Math.max(1, limit.retryAfterSeconds ?? 60)) },
    });
  }

  const url = new URL(request.url);
  const advisor = normalizeAdvisor(url.searchParams.get('advisor'));
  const currency = normalizeCurrency(url.searchParams.get('currency'));
  const country = normalizeCountry(url.searchParams.get('country'));
  if (!advisor || !currency) {
    return NextResponse.json({ ok: false, error: { code: 'INVALID_REQUEST' } }, { status: 400, headers: NO_STORE });
  }

  try {
    const grounding = await loadAdvisorGrounding({
      userId: user.id,
      advisor,
      currency,
      country,
      hasMarketEvidence: false,
    });
    return NextResponse.json({ ok: true, grounding }, { headers: NO_STORE });
  } catch (error) {
    const code = error instanceof Error && error.message === 'ECONOMIC_INTELLIGENCE_SERVER_NOT_CONFIGURED'
      ? 'SERVICE_NOT_CONFIGURED'
      : 'GROUNDING_UNAVAILABLE';
    return NextResponse.json({ ok: false, error: { code } }, { status: code === 'SERVICE_NOT_CONFIGURED' ? 503 : 502, headers: NO_STORE });
  }
}
