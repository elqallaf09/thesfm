import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { checkRateLimitWithMetadata } from '@/lib/server/rateLimiter';
import { loadDecisionMemoryInsight } from '@/domain/economic-intelligence/decisionMemory.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES = new Set(['purchase', 'investment', 'project', 'debt_saving', 'charity_zakat', 'budget']);

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request).catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: { code: 'UNAUTHENTICATED' } }, { status: 401 });

  const limit = checkRateLimitWithMetadata(`user:${user.id}`, { max: 30, windowMs: 60_000, prefix: 'decision-memory' });
  if (!limit.allowed) return NextResponse.json({ ok: false, error: { code: 'APPLICATION_RATE_LIMITED' } }, { status: 429 });

  const url = new URL(request.url);
  const decisionType = String(url.searchParams.get('decisionType') ?? '');
  if (!TYPES.has(decisionType)) return NextResponse.json({ ok: false, error: { code: 'INVALID_DECISION_TYPE' } }, { status: 400 });
  const amountRaw = Number(url.searchParams.get('amount'));
  const amount = Number.isFinite(amountRaw) && amountRaw > 0 ? amountRaw : null;
  const currency = String(url.searchParams.get('currency') ?? '').trim().toUpperCase();
  if (currency && !/^[A-Z]{3}$/.test(currency)) return NextResponse.json({ ok: false, error: { code: 'INVALID_CURRENCY' } }, { status: 400 });

  try {
    const insight = await loadDecisionMemoryInsight({ userId: user.id, decisionType, amount, currency: currency || null });
    return NextResponse.json({ ok: true, insight }, { headers: { 'cache-control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ ok: false, error: { code: 'DECISION_MEMORY_UNAVAILABLE' } }, { status: 502 });
  }
}
