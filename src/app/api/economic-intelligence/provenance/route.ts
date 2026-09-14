import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { checkRateLimitWithMetadata } from '@/lib/server/rateLimiter';
import { loadEvidenceProvenance } from '@/domain/economic-intelligence/evidenceProvenance.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'cache-control': 'private, no-store' };

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request).catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: NO_STORE });

  const limit = checkRateLimitWithMetadata(`user:${user.id}`, { max: 30, windowMs: 60_000, prefix: 'economic-intelligence-provenance' });
  if (!limit.allowed) return NextResponse.json({ ok: false, error: { code: 'APPLICATION_RATE_LIMITED' } }, {
    status: 429,
    headers: { ...NO_STORE, 'Retry-After': String(Math.max(1, limit.retryAfterSeconds)) },
  });

  try {
    const provenance = await loadEvidenceProvenance(user.id);
    return NextResponse.json({ ok: true, provenance }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ ok: false, error: { code: 'PROVENANCE_UNAVAILABLE' } }, { status: 502, headers: NO_STORE });
  }
}
