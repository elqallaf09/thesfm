import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin, requireAdminApiAccess } from '@/lib/server/adminAccess';
import { AI_USAGE_FEATURES, isAiUsageFeature, type AiUsageFeature } from '@/lib/server/aiUsage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AdminUserLookup = {
  id: string;
  email?: string;
};

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      'Cache-Control': 'private, no-store',
      ...(init?.headers ?? {}),
    },
  });
}

function cleanString(value: unknown, maxLength = 500) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function cleanEmail(value: unknown) {
  const email = cleanString(value, 320).toLowerCase();
  return email && email.includes('@') ? email : '';
}

function cleanDailyLimit(value: unknown) {
  const number = typeof value === 'number' ? value : Number(cleanString(value, 32));
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : null;
}

async function requireAdmin(request: NextRequest) {
  const auth = await requireAdminApiAccess(request, 'users_management');
  return auth.ok ? auth : null;
}

async function findUserByEmail(admin: NonNullable<ReturnType<typeof createServerSupabaseAdmin>>, email: string): Promise<AdminUserLookup | null> {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const users = data.users ?? [];
    const found = users.find(user => user.email?.trim().toLowerCase() === email);
    if (found) return { id: found.id, email: found.email ?? undefined };
    if (users.length < 1000) break;
  }
  return null;
}

async function resolveTargetUser(
  admin: NonNullable<ReturnType<typeof createServerSupabaseAdmin>>,
  payload: Record<string, unknown>,
) {
  const userId = cleanString(payload.userId ?? payload.user_id, 80);
  const email = cleanEmail(payload.email);
  if (userId) return { id: userId, email: email || undefined };
  if (!email) return null;
  return findUserByEmail(admin, email);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) return json({ ok: false, code: 'FORBIDDEN' }, { status: 403 });
  const admin = auth.admin;

  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!payload) return json({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });

  const featureInput = cleanString(payload.feature, 80) || 'all';
  const feature: AiUsageFeature = isAiUsageFeature(featureInput) ? featureInput : 'all';
  const dailyLimit = cleanDailyLimit(payload.dailyLimit ?? payload.daily_limit);
  const targetUser = await resolveTargetUser(admin, payload);

  if (!targetUser) return json({ ok: false, code: 'USER_NOT_FOUND' }, { status: 404 });
  if (!AI_USAGE_FEATURES.includes(feature)) return json({ ok: false, code: 'INVALID_FEATURE' }, { status: 400 });
  if (dailyLimit === null) return json({ ok: false, code: 'INVALID_DAILY_LIMIT' }, { status: 400 });

  const record = {
    user_id: targetUser.id,
    feature,
    daily_limit: dailyLimit,
    is_enabled: payload.isEnabled === undefined && payload.is_enabled === undefined
      ? true
      : Boolean(payload.isEnabled ?? payload.is_enabled),
    is_blocked: Boolean(payload.isBlocked ?? payload.is_blocked),
    notes: cleanString(payload.notes, 1200) || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from('ai_usage_limits')
    .upsert(record, { onConflict: 'user_id,feature' })
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('[admin-ai-usage-limits] upsert failed', { code: error.code, message: error.message });
    return json({ ok: false, code: 'UPSERT_FAILED' }, { status: 500 });
  }

  return json({
    ok: true,
    success: true,
    user: targetUser,
    limit: data,
  });
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) return json({ ok: false, code: 'FORBIDDEN' }, { status: 403 });
  const admin = auth.admin;

  const url = new URL(request.url);
  const email = cleanEmail(url.searchParams.get('email'));
  const userId = cleanString(url.searchParams.get('userId') ?? url.searchParams.get('user_id'), 80);
  const targetUser = userId ? { id: userId, email: email || undefined } : email ? await findUserByEmail(admin, email) : null;
  if (!targetUser) return json({ ok: false, code: 'USER_NOT_FOUND' }, { status: 404 });

  const today = new Date(Math.floor((Date.now() + 3 * 60 * 60 * 1000) / 86_400_000) * 86_400_000).toISOString().slice(0, 10);
  const [{ data: limits, error: limitsError }, { data: events, error: eventsError }] = await Promise.all([
    admin.from('ai_usage_limits').select('*').eq('user_id', targetUser.id).order('feature', { ascending: true }),
    admin.from('ai_usage_events').select('feature,units,created_at,metadata').eq('user_id', targetUser.id).eq('usage_date', today).order('created_at', { ascending: false }),
  ]);

  if (limitsError || eventsError) {
    return json({ ok: false, code: 'LOAD_FAILED' }, { status: 500 });
  }

  return json({
    ok: true,
    success: true,
    user: targetUser,
    usageDate: today,
    limits: limits ?? [],
    events: events ?? [],
  });
}
