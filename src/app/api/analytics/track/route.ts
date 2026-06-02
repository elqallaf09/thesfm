import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createServerSupabaseAdmin, getUserFromBearerToken } from '@/lib/server/adminAccess';

export const runtime = 'nodejs';

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

function ignored(code: string, status = 200) {
  return NextResponse.json({ ok: false, success: false, ignored: true, code }, { status });
}

function safeLog(level: 'warn' | 'error', message: string, details?: Record<string, unknown>) {
  const payload = details
    ? Object.fromEntries(Object.entries(details).filter(([key]) => !/token|secret|key|cookie|authorization/i.test(key)))
    : undefined;
  if (level === 'warn') console.warn(message, payload ?? '');
  else console.error(message, payload ?? '');
}

async function safeSupabaseRequest<T extends { error?: unknown }>(request: PromiseLike<T>): Promise<T | { error: unknown }> {
  try {
    return await request;
  } catch (error) {
    return { error };
  }
}

function errorCode(error: unknown) {
  return error && typeof error === 'object' && 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
}

function errorMessage(error: unknown) {
  return error && typeof error === 'object' && 'message' in error ? String((error as { message?: unknown }).message ?? '') : String(error ?? '');
}

function schemaRelatedError(error: unknown) {
  const code = errorCode(error);
  const message = errorMessage(error).toLowerCase();
  return (
    code === '42P01' ||
    code === '42703' ||
    code === 'PGRST204' ||
    code === 'PGRST205' ||
    message.includes('schema cache') ||
    message.includes('does not exist')
  );
}

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

async function readRequestBody(request: Request): Promise<Record<string, unknown> | null> {
  const contentType = request.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      const parsed = await request.json();
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
    }

    const raw = await request.text().catch(() => '');
    if (!raw.trim()) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await readRequestBody(request);
    const rawEventType = text(body?.event_type, 80) ?? 'page_view';
    const eventType = ALLOWED_EVENTS.has(rawEventType) ? rawEventType : null;
    const pagePath = text(body?.page_path, 300);

    if (!eventType || !pagePath) {
      return ignored('ANALYTICS_INVALID_PAYLOAD');
    }

    const admin = createServerSupabaseAdmin();
    if (!admin) {
      safeLog('warn', 'Analytics service role key is not configured');
      return ignored('ANALYTICS_SERVICE_NOT_CONFIGURED');
    }

    const userAgent = request.headers.get('user-agent') || '';
    const cookieStore = await cookies();
    const accessToken = text(body?.access_token, 4096) ?? cookieStore.get('sfm_access_token')?.value ?? null;
    const user = accessToken ? await getUserFromBearerToken(accessToken) : null;

    const sessionId = requiredText(body?.session_id, fallbackSessionId(request, userAgent), 180);
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
      metadata: safeMetadata(body?.metadata),
    };

    const minimalEventPayload = {
      user_id: eventPayload.user_id,
      session_id: eventPayload.session_id,
      event_type: eventPayload.event_type,
      page_path: eventPayload.page_path,
      language: eventPayload.language,
      device_type: eventPayload.device_type,
      browser: eventPayload.browser,
      os: eventPayload.os,
      metadata: eventPayload.metadata,
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

    const sessionResult = await safeSupabaseRequest(admin
      .from('site_sessions')
      .upsert(sessionPayload, { onConflict: 'session_id' }));

    let resolvedSessionResult = sessionResult;
    if (resolvedSessionResult.error && schemaRelatedError(resolvedSessionResult.error) && errorCode(resolvedSessionResult.error) !== '42P01') {
      resolvedSessionResult = await safeSupabaseRequest(admin
        .from('site_sessions')
        .upsert({ session_id: sessionId }, { onConflict: 'session_id' }));
    }

    if (resolvedSessionResult.error && errorCode(resolvedSessionResult.error) !== '42P01') {
      safeLog('warn', '[analytics] session upsert ignored', {
        code: errorCode(resolvedSessionResult.error),
        message: errorMessage(resolvedSessionResult.error),
      });
    }

    let eventResult = await safeSupabaseRequest(admin.from('site_events').insert(eventPayload));
    if (eventResult.error && schemaRelatedError(eventResult.error) && errorCode(eventResult.error) !== '42P01') {
      eventResult = await safeSupabaseRequest(admin.from('site_events').insert(minimalEventPayload));
    }
    if (!eventResult.error) return NextResponse.json({ ok: true, success: true });

    const missingSiteTables = errorCode(eventResult.error) === '42P01' || errorCode(resolvedSessionResult.error) === '42P01';
    if (!missingSiteTables) {
      safeLog('error', '[analytics] tracking insert failed', {
        eventCode: errorCode(eventResult.error),
        eventMessage: errorMessage(eventResult.error),
        sessionCode: errorCode(resolvedSessionResult.error),
        sessionMessage: errorMessage(resolvedSessionResult.error),
      });
      return ignored('ANALYTICS_INSERT_FAILED');
    }

    const legacyResult = await safeSupabaseRequest(admin.from('analytics_events').insert({
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
    }));

    if (legacyResult.error) {
      safeLog('error', '[analytics] tracking insert failed', {
        eventCode: errorCode(eventResult.error),
        eventMessage: errorMessage(eventResult.error),
        legacyCode: errorCode(legacyResult.error),
        legacyMessage: errorMessage(legacyResult.error),
      });
      return ignored('ANALYTICS_INSERT_FAILED');
    }

    return NextResponse.json({ ok: true, success: true, fallback: 'analytics_events' });
  } catch (error) {
    safeLog('error', '[analytics] tracking failed', {
      name: error instanceof Error ? error.name : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
    return ignored('ANALYTICS_INSERT_FAILED');
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
