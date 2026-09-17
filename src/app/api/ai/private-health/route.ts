import { NextRequest, NextResponse } from 'next/server';
import { aiProviderConfigured, checkPrivateAiHealth } from '@/lib/server/aiProvider';
import { getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { checkRateLimitWithMetadata } from '@/lib/server/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const NO_STORE = { 'cache-control': 'private, no-store' };

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request).catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: NO_STORE });

  const limit = checkRateLimitWithMetadata(`user:${user.id}`, {
    max: 12,
    windowMs: 60_000,
    prefix: 'sfm-private-ai-health',
  });
  if (!limit.allowed) {
    return NextResponse.json({ ok: false, error: { code: 'APPLICATION_RATE_LIMITED' } }, {
      status: 429,
      headers: { ...NO_STORE, 'Retry-After': String(Math.max(1, limit.retryAfterSeconds ?? 60)) },
    });
  }

  if (!aiProviderConfigured()) {
    return NextResponse.json({ ok: false, error: { code: 'SFM_PRIVATE_AI_NOT_CONFIGURED' }, nodes: [] }, { status: 503, headers: NO_STORE });
  }

  const nodes = await checkPrivateAiHealth();
  const reachable = nodes.filter(node => node.reachable).length;
  return NextResponse.json({
    ok: reachable > 0,
    service: 'sfm-private-ai',
    reachable,
    configured: nodes.length,
    nodes,
  }, { status: reachable > 0 ? 200 : 503, headers: NO_STORE });
}
