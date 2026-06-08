import { NextResponse } from 'next/server';
import { cleanEnv } from '@/lib/market/providerConfig';
import {
  loginToMyfxbook,
  publicMyfxbookLoginStatus,
  type MyfxbookLoginStatus,
} from '@/lib/market/providers/myfxbook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_MYFXBOOK_API_BASE_URL = 'https://www.myfxbook.com/api';
const cacheHeaders = {
  'Cache-Control': 'private, no-store',
};

function shouldDebug() {
  return process.env.NODE_ENV !== 'production' || process.env.DEBUG_MARKET_DATA === 'true';
}

function maskProviderMessage(message: string | null | undefined) {
  if (!message) return null;
  return message.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]');
}

function myfxbookBaseUrlDiagnostic(rawBaseUrl: string) {
  const candidate = rawBaseUrl || DEFAULT_MYFXBOOK_API_BASE_URL;
  try {
    const parsed = new URL(candidate);
    const valid = parsed.protocol === 'https:' || parsed.protocol === 'http:';
    return {
      hasBaseUrl: Boolean(rawBaseUrl),
      baseUrlValid: valid,
      usingDefaultBaseUrl: !rawBaseUrl || !valid,
    };
  } catch {
    return {
      hasBaseUrl: Boolean(rawBaseUrl),
      baseUrlValid: false,
      usingDefaultBaseUrl: true,
    };
  }
}

function contentTypeCategory(contentType: string | null | undefined) {
  const normalized = String(contentType ?? '').toLowerCase();
  if (!normalized) return null;
  if (normalized.includes('json')) return 'json';
  if (normalized.includes('html')) return 'html';
  if (normalized.includes('text')) return 'text';
  return 'other';
}

function publicMessageForStatus(status: MyfxbookLoginStatus) {
  if (status === 'success') return 'تم الاتصال بمزود Myfxbook واستلام جلسة صالحة.';
  if (status === 'missing_env') return 'إعدادات مزود المشاعر غير مكتملة. يرجى إضافة بيانات Myfxbook في Environment Variables ثم إعادة النشر.';
  if (status === 'invalid_credentials') return 'تم رفض تسجيل الدخول إلى Myfxbook. تحقق من بيانات الحساب أو جرّب تسجيل الدخول مباشرة في موقع Myfxbook.';
  if (status === 'cloudflare_blocked') return 'مزود Myfxbook رفض الاتصال من الخادم. قد يكون بسبب حماية Cloudflare أو قيود الحساب المجاني.';
  if (status === 'rate_limited') return 'تم تجاوز حد طلبات مزود المشاعر مؤقتاً. يرجى المحاولة لاحقاً.';
  return 'تعذر الاتصال بمزود المشاعر حالياً. يرجى المحاولة لاحقاً.';
}

export async function GET() {
  const lastCheckedAt = new Date().toISOString();
  const email = cleanEnv(process.env.MYFXBOOK_EMAIL);
  const password = cleanEnv(process.env.MYFXBOOK_PASSWORD);
  const rawBaseUrl = cleanEnv(process.env.MYFXBOOK_API_BASE_URL);
  const baseUrl = myfxbookBaseUrlDiagnostic(rawBaseUrl);
  const missingVariables = [
    email ? null : 'MYFXBOOK_EMAIL',
    password ? null : 'MYFXBOOK_PASSWORD',
  ].filter((value): value is string => Boolean(value));
  const providerConfigured = missingVariables.length === 0;

  if (shouldDebug()) {
    console.info('[Myfxbook] health diagnostic started', {
      missingVariables,
      hasBaseUrl: baseUrl.hasBaseUrl,
      baseUrlValid: baseUrl.baseUrlValid,
      providerConfigured,
    });
  }

  const login = providerConfigured
    ? await loginToMyfxbook({ force: true }).catch(error => ({
        ok: false as const,
        code: 'MYFXBOOK_PROVIDER_FAILED' as const,
        providerMessage: maskProviderMessage(error instanceof Error ? error.message : null),
        httpStatus: undefined,
        contentType: null,
        responseKind: 'empty' as const,
        canReachMyfxbook: false,
      }))
    : null;

  const loginStatus: MyfxbookLoginStatus = !providerConfigured
    ? 'missing_env'
    : login?.ok
      ? 'success'
      : publicMyfxbookLoginStatus(login?.code);

  if (shouldDebug()) {
    console.info('[Myfxbook] health diagnostic completed', {
      loginStatus,
      httpStatus: login?.httpStatus ?? null,
      contentType: contentTypeCategory(login?.contentType),
      responseKind: login?.responseKind ?? null,
      sessionReceived: Boolean(login?.ok),
    });
  }

  return NextResponse.json({
    provider: 'myfxbook',
    configured: providerConfigured,
    providerConfigured,
    hasEmail: Boolean(email),
    hasPassword: Boolean(password),
    hasBaseUrl: baseUrl.hasBaseUrl,
    baseUrlValid: baseUrl.baseUrlValid,
    usingDefaultBaseUrl: baseUrl.usingDefaultBaseUrl,
    missingVariables,
    loginStatus,
    message: publicMessageForStatus(loginStatus),
    lastCheckedAt,
    loginAttempted: providerConfigured,
    httpStatus: login?.httpStatus ?? null,
    responseKind: login?.responseKind ?? null,
    contentType: contentTypeCategory(login?.contentType),
    sessionReceived: Boolean(login?.ok),
    canReachProvider: login?.canReachMyfxbook ?? false,
    providerMessage: login && !login.ok ? maskProviderMessage(login.providerMessage) : null,
  }, { status: 200, headers: cacheHeaders });
}
