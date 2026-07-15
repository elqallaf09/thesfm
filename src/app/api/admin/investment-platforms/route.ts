import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  cleanPlatformName,
  cleanPlatformType,
  cleanPlatformWebsite,
  isPotentialPlatformDuplicate,
  normalizePlatformAliases,
  normalizePlatformName,
  platformRowToDirectoryItem,
  platformSlug,
  PlatformValidationError,
} from '@/lib/investments/platformDirectory';
import { requireAdminApiAccess } from '@/lib/server/adminAccess';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_COLUMNS = 'id,canonical_name,normalized_name,slug,platform_type,website_url,logo_url,country_code,aliases,status,is_seeded,approved_at,created_at,updated_at';

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

async function audit(
  admin: SupabaseClient<any, 'public', any>,
  actorUserId: string,
  actorEmail: string | null,
  action: string,
  before: unknown,
  after: unknown,
) {
  const { error } = await admin.from('admin_audit_logs').insert({
    actor_user_id: actorUserId,
    actor_email: actorEmail,
    action,
    old_value: before,
    new_value: after,
  });
  if (error) console.error('[admin-investment-platforms] audit failed', { code: error.code, message: error.message });
}

export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { max: 60, windowMs: 60_000, prefix: 'admin-investment-platforms' });
  if (limited) return limited;
  const auth = await requireAdminApiAccess(request, 'company_reviews');
  if (!auth.ok) return json({ ok: false, code: auth.code }, auth.status);

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  let query = auth.admin.from('investment_platforms').select(ADMIN_COLUMNS).order('created_at', { ascending: false }).limit(200);
  if (status && ['approved', 'pending', 'rejected', 'disabled'].includes(status)) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) {
    console.error('[admin-investment-platforms] load failed', { code: error.code, message: error.message });
    return json({ ok: false, code: 'PLATFORM_MODERATION_LOAD_FAILED' }, 500);
  }

  const items = (data ?? []).map(row => platformRowToDirectoryItem(row as Record<string, unknown>));
  return json({
    ok: true,
    items: items.map(item => ({
      ...item,
      potentialDuplicates: items
        .filter(candidate => candidate.id !== item.id && isPotentialPlatformDuplicate(item.canonicalName, candidate.canonicalName))
        .slice(0, 5)
        .map(candidate => ({ id: candidate.id, name: candidate.canonicalName, status: candidate.status })),
    })),
  });
}

export async function PATCH(request: Request) {
  const limited = rateLimitRequest(request, { max: 30, windowMs: 60_000, prefix: 'admin-investment-platform-moderate' });
  if (limited) return limited;
  const auth = await requireAdminApiAccess(request, 'company_reviews');
  if (!auth.ok) return json({ ok: false, code: auth.code }, auth.status);

  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const id = typeof body?.id === 'string' ? body.id : '';
    const action = typeof body?.action === 'string' ? body.action : '';
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ ok: false, code: 'INVALID_PLATFORM_ID' }, 400);

    const { data: before, error: loadError } = await auth.admin
      .from('investment_platforms')
      .select(ADMIN_COLUMNS)
      .eq('id', id)
      .single();
    if (loadError || !before) return json({ ok: false, code: 'PLATFORM_NOT_FOUND' }, 404);

    if (action === 'merge') {
      const targetId = typeof body?.targetId === 'string' ? body.targetId : '';
      if (!/^[0-9a-f-]{36}$/i.test(targetId) || targetId === id) return json({ ok: false, code: 'INVALID_MERGE_TARGET' }, 400);
      const { error } = await auth.admin.rpc('merge_investment_platforms', {
        source_platform_id: id,
        target_platform_id: targetId,
        actor_user_id: auth.user.id,
      });
      if (error) {
        console.error('[admin-investment-platforms] merge failed', { code: error.code, message: error.message });
        return json({ ok: false, code: 'PLATFORM_MERGE_FAILED' }, 409);
      }
      return json({ ok: true, action: 'merge' });
    }

    if (!['approve', 'reject', 'disable', 'update'].includes(action)) return json({ ok: false, code: 'INVALID_MODERATION_ACTION' }, 400);
    const canonicalName = body?.name === undefined ? String(before.canonical_name) : cleanPlatformName(body.name);
    const normalizedName = normalizePlatformName(canonicalName);
    const platformType = body?.platformType === undefined ? cleanPlatformType(before.platform_type) : cleanPlatformType(body.platformType);
    const websiteUrl = body?.websiteUrl === undefined ? cleanPlatformWebsite(before.website_url) : cleanPlatformWebsite(body.websiteUrl);
    const aliases = body?.aliases === undefined ? normalizePlatformAliases(before.aliases) : normalizePlatformAliases(body.aliases);
    const nextStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : action === 'disable' ? 'disabled' : before.status;

    const { data: duplicate } = await auth.admin
      .from('investment_platforms')
      .select('id,canonical_name,status')
      .eq('normalized_name', normalizedName)
      .neq('id', id)
      .maybeSingle();
    if (duplicate) return json({ ok: false, code: 'PLATFORM_DUPLICATE', duplicate: { id: duplicate.id, name: duplicate.canonical_name, status: duplicate.status } }, 409);

    const updatePayload: Record<string, unknown> = {
      canonical_name: canonicalName,
      normalized_name: normalizedName,
      platform_type: platformType,
      website_url: websiteUrl,
      aliases,
      status: nextStatus,
      ...(canonicalName !== before.canonical_name ? { slug: `${platformSlug(canonicalName)}-${id.slice(0, 8)}`.slice(0, 100) } : {}),
      ...(action === 'approve' ? { approved_by: auth.user.id, approved_at: new Date().toISOString() } : {}),
    };

    const { data: updated, error } = await auth.admin
      .from('investment_platforms')
      .update(updatePayload)
      .eq('id', id)
      .select(ADMIN_COLUMNS)
      .single();
    if (error || !updated) {
      console.error('[admin-investment-platforms] update failed', { code: error?.code, message: error?.message });
      return json({ ok: false, code: 'PLATFORM_MODERATION_FAILED' }, 500);
    }

    await audit(auth.admin, auth.user.id, auth.user.email ?? null, `investment_platform_${action}`, before, updated);
    return json({ ok: true, item: platformRowToDirectoryItem(updated as Record<string, unknown>) });
  } catch (error) {
    if (error instanceof PlatformValidationError) return json({ ok: false, code: error.code }, 400);
    console.error('[admin-investment-platforms] invalid moderation request', { message: error instanceof Error ? error.message : String(error) });
    return json({ ok: false, code: 'INVALID_REQUEST' }, 400);
  }
}
