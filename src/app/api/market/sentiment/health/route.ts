import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { cleanEnv, getMarketSentimentProviderConfig } from '@/lib/market/providerConfig';
import { loginToMyfxbook } from '@/lib/market/providers/myfxbook';
import { isAdminAccessCodeConfigured, isValidAdminAccessCode } from '@/lib/server/adminAccess';

export const dynamic = 'force-dynamic';

const DEFAULT_MYFXBOOK_API_BASE_URL = 'https://www.myfxbook.com/api';

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function requestToken(request: NextRequest) {
  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  return cleanEnv(request.nextUrl.searchParams.get('code'))
    || cleanEnv(request.headers.get('x-admin-diagnostics-token'))
    || cleanEnv(bearer);
}

function isAllowed(request: NextRequest) {
  const token = requestToken(request);
  const healthToken = cleanEnv(process.env.MARKET_PROVIDER_HEALTH_TOKEN);
  if (!token) return false;
  if (healthToken && safeEqual(token, healthToken)) return true;
  return isAdminAccessCodeConfigured() && isValidAdminAccessCode(token);
}

function maskedProviderMessage(message: string | null | undefined) {
  if (!message) return null;
  return message.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]');
}

function publicMyfxbookCode(code: string | null | undefined) {
  if (code === 'MYFXBOOK_CREDENTIALS_NOT_CONFIGURED') return 'MISSING_CREDENTIALS';
  if (code === 'MYFXBOOK_AUTH_FAILED') return 'LOGIN_REJECTED';
  if (code === 'MYFXBOOK_SESSION_MISSING') return 'NO_SESSION';
  if (code === 'MYFXBOOK_TIMEOUT') return 'TIMEOUT';
  if (code === 'MYFXBOOK_RATE_LIMITED') return 'RATE_LIMITED';
  return code ? 'PROVIDER_DOWN' : null;
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

export async function GET(request: NextRequest) {
  const healthTokenConfigured = Boolean(cleanEnv(process.env.MARKET_PROVIDER_HEALTH_TOKEN));

  if (!healthTokenConfigured && !isAdminAccessCodeConfigured()) {
    return NextResponse.json({ ok: false, code: 'SENTIMENT_HEALTH_DISABLED' }, { status: 404 });
  }

  if (!isAllowed(request)) {
    return NextResponse.json({ ok: false, code: 'SENTIMENT_HEALTH_FORBIDDEN' }, { status: 403 });
  }

  const rawEmail = cleanEnv(process.env.MYFXBOOK_EMAIL);
  const rawPassword = cleanEnv(process.env.MYFXBOOK_PASSWORD);
  const rawBaseUrl = cleanEnv(process.env.MYFXBOOK_API_BASE_URL);
  const baseUrl = myfxbookBaseUrlDiagnostic(rawBaseUrl);
  const missingVariables = [
    rawEmail ? null : 'MYFXBOOK_EMAIL',
    rawPassword ? null : 'MYFXBOOK_PASSWORD',
  ].filter((value): value is string => Boolean(value));
  const providerConfigured = Boolean(rawEmail && rawPassword);
  const config = getMarketSentimentProviderConfig();
  const loginAttempted = providerConfigured;

  console.info('[Myfxbook] health diagnostic started', {
    missingVariables,
    hasBaseUrl: baseUrl.hasBaseUrl,
    baseUrlValid: baseUrl.baseUrlValid,
    providerConfigured,
    providerIsMyfxbook: config.provider === 'myfxbook',
  });

  const login = loginAttempted
    ? await loginToMyfxbook({ force: true }).catch(error => ({
        ok: false as const,
        code: 'MYFXBOOK_PROVIDER_FAILED' as const,
        providerMessage: maskedProviderMessage(error instanceof Error ? error.message : null),
        httpStatus: undefined,
        canReachMyfxbook: false,
      }))
    : null;

  return NextResponse.json({
    ok: true,
    provider: config.provider ?? (config.providerEnv || null),
    providerIsMyfxbook: config.provider === 'myfxbook',
    providerConfigured,
    hasEmail: Boolean(rawEmail),
    hasPassword: Boolean(rawPassword),
    hasBaseUrl: baseUrl.hasBaseUrl,
    hasApiBaseUrl: baseUrl.hasBaseUrl,
    baseUrlValid: baseUrl.baseUrlValid,
    usingDefaultBaseUrl: baseUrl.usingDefaultBaseUrl,
    missingVariables,
    canReachMyfxbook: login?.canReachMyfxbook ?? false,
    loginAttempted,
    loginOk: login?.ok ?? false,
    code: login && !login.ok ? publicMyfxbookCode(login.code) : providerConfigured ? null : 'MISSING_CREDENTIALS',
    providerCode: login && !login.ok ? login.code : providerConfigured ? null : 'MYFXBOOK_CREDENTIALS_NOT_CONFIGURED',
    httpStatus: login?.httpStatus ?? null,
    providerMessage: login && !login.ok ? maskedProviderMessage(login.providerMessage) : null,
    hasSession: Boolean(login?.ok),
  });
}
