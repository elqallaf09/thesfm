import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { checkRateLimitWithMetadata } from '@/lib/server/rateLimiter';
import { loadEconomicIntelligenceReadiness } from '@/domain/economic-intelligence/readiness.server';
import { clearReadinessConfirmation, normalizeReadinessConfirmationKey, setReadinessConfirmation } from '@/domain/economic-intelligence/readinessConfirmations.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'cache-control': 'private, no-store' };

async function auth(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request).catch(() => null);
  if (!user) return { response: NextResponse.json({ ok: false, error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: NO_STORE }) } as const;
  const limit = checkRateLimitWithMetadata(`user:${user.id}`, { max: 30, windowMs: 60_000, prefix: 'economic-intelligence-readiness' });
  if (!limit.allowed) return { response: NextResponse.json({ ok: false, error: { code: 'APPLICATION_RATE_LIMITED' } }, {
    status: 429,
    headers: { ...NO_STORE, 'Retry-After': String(Math.max(1, limit.retryAfterSeconds)) },
  }) } as const;
  return { user } as const;
}

export async function GET(request: NextRequest) {
  const session = await auth(request);
  if ('response' in session) return session.response;
  try {
    const readiness = await loadEconomicIntelligenceReadiness(session.user.id);
    return NextResponse.json({ ok: true, readiness }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ ok: false, error: { code: 'READINESS_UNAVAILABLE' } }, { status: 502, headers: NO_STORE });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth(request);
  if ('response' in session) return session.response;
  try {
    const body = await request.json().catch(() => null);
    const key = normalizeReadinessConfirmationKey(body?.key);
    if (!key) return NextResponse.json({ ok: false, error: { code: 'INVALID_CONFIRMATION_KEY' } }, { status: 400, headers: NO_STORE });
    await setReadinessConfirmation(session.user.id, key);
    const readiness = await loadEconomicIntelligenceReadiness(session.user.id);
    return NextResponse.json({ ok: true, readiness }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ ok: false, error: { code: 'CONFIRMATION_SAVE_FAILED' } }, { status: 502, headers: NO_STORE });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth(request);
  if ('response' in session) return session.response;
  try {
    const key = normalizeReadinessConfirmationKey(new URL(request.url).searchParams.get('key'));
    if (!key) return NextResponse.json({ ok: false, error: { code: 'INVALID_CONFIRMATION_KEY' } }, { status: 400, headers: NO_STORE });
    await clearReadinessConfirmation(session.user.id, key);
    const readiness = await loadEconomicIntelligenceReadiness(session.user.id);
    return NextResponse.json({ ok: true, readiness }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ ok: false, error: { code: 'CONFIRMATION_DELETE_FAILED' } }, { status: 502, headers: NO_STORE });
  }
}
