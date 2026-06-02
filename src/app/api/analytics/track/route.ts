import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createServerSupabaseAdmin, getUserFromBearerToken } from '@/lib/server/adminAccess';

const ALLOWED_EVENTS = new Set([
  'page_view',
  'section_view',
  'account_created',
  'login',
  'logout',
  'button_click',
  'signup',
  'add_income',
  'add_expense',
  'add_saving',
  'add_goal',
  'create_project',
  'export_report',
  'use_calculator',
  'open_market_analysis',
  'open_financial_theories',
  'open_reports',
  'open_charity',
  'open_projects',
  'change_language',
]);

const SENSITIVE_KEY_PATTERN = /(amount|value|salary|income|expense|saving|zakat|goal|note|description|phone|mobile|security|password|document|file|private|token|secret)/i;

function text(value: unknown, limit = 240) {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean ? clean.slice(0, limit) : null;
}

function requiredText(value: unknown, fallback: string, limit = 240) {
  return text(value, limit) ?? fallback;
}

function safeMetadata(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key, item]) => !SENSITIVE_KEY_PATTERN.test(key) && item != null)
      .map(([key, item]) => [key, typeof item === 'object' ? String(item).slice(0, 240) : item]),
  );
}

function browser(userAgent: string) {
  if (/edg\//i.test(userAgent)) return 'Edge';
  if (/firefox/i.test(userAgent)) return 'Firefox';
  if (/crios|chrome/i.test(userAgent) && !/edg\//i.test(userAgent)) return 'Chrome';
  if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent)) return 'Safari';
  return 'Other';
}

function deviceType(userAgent: string) {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return 'tablet';
  if (/android/.test(ua) && !/mobile/.test(ua)) return 'tablet';
  if (/iphone|ipod|android|mobile/.test(ua)) return 'mobile';
  return 'desktop';
}

function os(userAgent: string) {
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'iOS';
  if (/android/i.test(userAgent)) return 'Android';
  if (/windows/i.test(userAgent)) return 'Windows';
  if (/mac os|macintosh/i.test(userAgent)) return 'macOS';
  if (/linux/i.test(userAgent)) return 'Linux';
  return 'Other';
}

function requestIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

function fallbackSessionId(request: Request, userAgent: string) {
  const source = `${requestIp(request)}:${userAgent}:${new Date().toISOString().slice(0, 10)}`;
  return `server-${createHash('sha256').update(source).digest('hex').slice(0, 24)}`;
}

function cityFromHeader(value: string | null) {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const eventType = text(body?.event_type, 80);
    if (!eventType || !ALLOWED_EVENTS.has(eventType)) {
      return NextResponse.json({ success: false, error: 'unsupported_event' }, { status: 400 });
    }

    const admin = createServerSupabaseAdmin();
    if (!admin) return NextResponse.json({ success: false, error: 'analytics_not_configured' }, { status: 503 });

    const userAgent = request.headers.get('user-agent') || '';
    const cookieStore = await cookies();
    const accessToken = text(body?.access_token, 4096) ?? cookieStore.get('sfm_access_token')?.value ?? null;
    const user = accessToken ? await getUserFromBearerToken(accessToken) : null;

    const sessionId = requiredText(body?.session_id, fallbackSessionId(request, userAgent), 180);
    const pagePath = requiredText(body?.page_path, '/unknown', 300);
    const language = text(body?.language, 16) ?? 'ar';
    const resolvedDeviceType = text(body?.device_type, 80) ?? deviceType(userAgent);
    const resolvedBrowser = text(body?.browser, 80) ?? browser(userAgent);
    const resolvedOs = text(body?.os, 80) ?? text(body?.operating_system, 80) ?? os(userAgent);
    const referrer = text(body?.referrer, 600) ?? text(request.headers.get('referer'), 600);
    const sectionName = text(body?.section_name, 140) ?? text(body?.module, 140);
    const eventPayload = {
      user_id: user?.id ?? null,
      session_id: sessionId,
      event_type: eventType,
      page_path: pagePath,
      page_title: text(body?.page_title, 300),
      section_name: sectionName,
      referrer,
      language,
      device_type: resolvedDeviceType,
      browser: resolvedBrowser,
      os: resolvedOs,
      country: text(request.headers.get('x-vercel-ip-country'), 80),
      city: cityFromHeader(request.headers.get('x-vercel-ip-city')),
      metadata: safeMetadata(body?.metadata),
    };

    const sessionPayload: Record<string, unknown> = {
      session_id: sessionId,
      last_seen_at: new Date().toISOString(),
      language,
      device_type: resolvedDeviceType,
      browser: resolvedBrowser,
      os: resolvedOs,
      referrer,
    };
    if (user?.id) sessionPayload.user_id = user.id;

    const sessionResult = await admin
      .from('site_sessions')
      .upsert(sessionPayload, { onConflict: 'session_id' });

    const eventResult = await admin.from('site_events').insert(eventPayload);
    if (!eventResult.error) return NextResponse.json({ success: true });

    const missingSiteTables = eventResult.error.code === '42P01' || sessionResult.error?.code === '42P01';
    if (!missingSiteTables) {
      return NextResponse.json({ success: false, error: 'analytics_insert_failed' }, { status: 500 });
    }

    const legacyResult = await admin.from('analytics_events').insert({
      user_id: user?.id ?? null,
      session_id: sessionId,
      event_type: eventType,
      page_path: pagePath,
      page_title: eventPayload.page_title,
      module: sectionName,
      referrer,
      language,
      device_type: resolvedDeviceType,
      browser: resolvedBrowser,
      operating_system: resolvedOs,
      metadata: eventPayload.metadata,
    });

    if (legacyResult.error) {
      return NextResponse.json({ success: false, error: 'analytics_insert_failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, fallback: 'analytics_events' });
  } catch {
    return NextResponse.json({ success: false, error: 'analytics_failed' }, { status: 500 });
  }
}
