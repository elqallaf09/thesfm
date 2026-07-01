import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin, getCurrentUserFromRequest } from '@/lib/server/adminAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      'Cache-Control': 'private, no-store',
      ...(init?.headers ?? {}),
    },
  });
}

function normalizeLimit(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(100, parsed)) : 50;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });

  const admin = createServerSupabaseAdmin();
  if (!admin) return json({ ok: false, code: 'SERVICE_NOT_CONFIGURED', notifications: [] }, { status: 503 });

  const limit = normalizeLimit(request.nextUrl.searchParams.get('limit'));
  const unreadOnly = request.nextUrl.searchParams.get('unread') === '1' || request.nextUrl.searchParams.get('unread') === 'true';
  let query = admin
    .from('signal_notifications')
    .select('id,user_id,signal_id,symbol,action,event,title,message,channel,status,sent_at,read_at,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (unreadOnly) query = query.is('read_at', null);

  const { data, error } = await query;
  if (error) {
    console.error('[market/signal-alerts] load failed', { code: error.code, message: error.message });
    return json({ ok: false, code: error.code || 'LOAD_FAILED', notifications: [] }, { status: 500 });
  }

  return json({ ok: true, notifications: data ?? [], items: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });

  const admin = createServerSupabaseAdmin();
  if (!admin) return json({ ok: false, code: 'SERVICE_NOT_CONFIGURED' }, { status: 503 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const ids = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean) : [];
  const readAt = new Date().toISOString();
  let query = admin
    .from('signal_notifications')
    .update({ read_at: readAt, status: 'read' })
    .eq('user_id', user.id)
    .is('read_at', null);
  if (ids.length) query = query.in('id', ids);

  const { error } = await query;
  if (error) return json({ ok: false, code: error.code || 'UPDATE_FAILED' }, { status: 500 });
  return json({ ok: true, readAt });
}
