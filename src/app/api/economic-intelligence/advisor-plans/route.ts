import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin, getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { advisorRequestSchema } from '@/domain/economic-intelligence/advisorCapabilities';
import { loadCapabilityReport } from '@/domain/economic-intelligence/advisorCapabilities.server';
import { checkRateLimitWithMetadata } from '@/lib/server/rateLimiter';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request).catch(() => null);
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401, headers });
  const db = createServerSupabaseAdmin();
  if (!db) return NextResponse.json({ error: 'UNAVAILABLE' }, { status: 503, headers });
  const { data, error } = await db.from('sfm_advisor_plans').select('id,created_at,report').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30);
  return error ? NextResponse.json({ error: 'UNAVAILABLE' }, { status: 503, headers }) : NextResponse.json({ plans: data }, { headers });
}
export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request).catch(() => null);
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401, headers });
  const limit = checkRateLimitWithMetadata(`user:${user.id}`, { max: 12, windowMs: 60000, prefix: 'advisor-plans' });
  if (!limit.allowed) return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429, headers });
  const parsed = advisorRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400, headers });
  const db = createServerSupabaseAdmin();
  if (!db) return NextResponse.json({ error: 'UNAVAILABLE' }, { status: 503, headers });
  try {
    const report = await loadCapabilityReport(user.id, parsed.data);
    let id: string | null = null;
    if (parsed.data.save) {
      const result = await db.from('sfm_advisor_plans').insert({ user_id: user.id, report }).select('id').single();
      if (result.error) throw new Error('SAVE_FAILED');
      id = result.data.id;
    }
    return NextResponse.json({ report, id }, { headers });
  } catch { return NextResponse.json({ error: 'SOURCE_OR_SAVE_UNAVAILABLE' }, { status: 503, headers }); }
}
