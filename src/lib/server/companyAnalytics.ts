import { createHash, randomUUID } from 'crypto';
import type { NextRequest } from 'next/server';
import {
  emptyCompanyAnalytics,
  normalizeCompanyAnalytics,
  type CompanyAnalyticsEventType,
  type CompanyAnalyticsSummary,
} from '@/lib/companyAnalytics';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { getCompanyRequestUser } from '@/lib/server/companyListingHelpers';

export const COMPANY_ANALYTICS_SESSION_COOKIE = 'sfm_company_analytics_session';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

function hashIp(value: string | null) {
  if (!value) return null;
  const salt = process.env.ANALYTICS_HASH_SALT || process.env.NEXTAUTH_SECRET;
  if (!salt) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[CompanyAnalytics] ANALYTICS_HASH_SALT is not configured; storing analytics event without ip_hash.');
    }
    return null;
  }
  return createHash('sha256').update(`${salt}:${value}`).digest('hex');
}

function requestIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip');
}

function safeUserAgent(request: NextRequest) {
  return (request.headers.get('user-agent') || '').slice(0, 500) || null;
}

export async function getCompanyAnalytics(companyId: string): Promise<CompanyAnalyticsSummary> {
  if (!UUID_RE.test(companyId)) return emptyCompanyAnalytics(companyId);
  const admin = createServerSupabaseAdmin();
  if (!admin) return emptyCompanyAnalytics(companyId);

  const { data, error } = await admin
    .from('company_analytics_summary')
    .select('company_id,card_views_count,profile_views_count,website_clicks_count,contact_clicks_count,last_viewed_at')
    .eq('company_id', companyId)
    .maybeSingle();

  if (error || !data) return emptyCompanyAnalytics(companyId);
  return normalizeCompanyAnalytics(data as Record<string, unknown>, companyId);
}

export async function getCompanyAnalyticsBatch(companyIds: string[]) {
  const uniqueIds = Array.from(new Set(companyIds.filter(id => UUID_RE.test(id)))).slice(0, 100);
  const result: Record<string, CompanyAnalyticsSummary> = {};
  uniqueIds.forEach(id => {
    result[id] = emptyCompanyAnalytics(id);
  });

  if (!uniqueIds.length) return result;
  const admin = createServerSupabaseAdmin();
  if (!admin) return result;

  const { data } = await admin
    .from('company_analytics_summary')
    .select('company_id,card_views_count,profile_views_count,website_clicks_count,contact_clicks_count,last_viewed_at')
    .in('company_id', uniqueIds);

  (data ?? []).forEach(row => {
    const companyId = String((row as Record<string, unknown>).company_id ?? '');
    if (companyId) result[companyId] = normalizeCompanyAnalytics(row as Record<string, unknown>, companyId);
  });
  return result;
}

export async function trackCompanyAnalyticsEvent(
  request: NextRequest,
  companyId: string,
  eventType: CompanyAnalyticsEventType,
) {
  const sessionCookie = request.cookies.get(COMPANY_ANALYTICS_SESSION_COOKIE)?.value;
  const sessionId = sessionCookie || randomUUID();
  const shouldSetSessionCookie = !sessionCookie;

  if (!UUID_RE.test(companyId)) {
    return { ok: false, status: 400, code: 'INVALID_COMPANY_ID', inserted: false, sessionId, shouldSetSessionCookie };
  }

  const admin = createServerSupabaseAdmin();
  if (!admin) {
    return { ok: false, status: 503, code: 'SUPABASE_ADMIN_UNAVAILABLE', inserted: false, sessionId, shouldSetSessionCookie };
  }

  const { data: company } = await admin.from('company_listings').select('id').eq('id', companyId).maybeSingle();
  if (!company) {
    return { ok: false, status: 404, code: 'COMPANY_NOT_FOUND', inserted: false, sessionId, shouldSetSessionCookie };
  }

  const user = await getCompanyRequestUser(request);
  const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();
  let duplicateQuery = admin
    .from('company_analytics_events')
    .select('id')
    .eq('company_id', companyId)
    .eq('event_type', eventType)
    .gte('created_at', since)
    .limit(1);

  if (user?.id) duplicateQuery = duplicateQuery.eq('user_id', user.id);
  else duplicateQuery = duplicateQuery.eq('session_id', sessionId);

  const { data: duplicate } = await duplicateQuery.maybeSingle();
  if (duplicate) {
    return { ok: true, status: 200, code: 'DUPLICATE_SKIPPED', inserted: false, sessionId, shouldSetSessionCookie };
  }

  const { error } = await admin.from('company_analytics_events').insert({
    company_id: companyId,
    event_type: eventType,
    user_id: user?.id ?? null,
    session_id: sessionId,
    ip_hash: hashIp(requestIp(request)),
    user_agent: safeUserAgent(request),
  });

  if (error) {
    return { ok: false, status: 500, code: 'TRACK_FAILED', inserted: false, sessionId, shouldSetSessionCookie };
  }

  return { ok: true, status: 200, code: 'TRACKED', inserted: true, sessionId, shouldSetSessionCookie };
}
