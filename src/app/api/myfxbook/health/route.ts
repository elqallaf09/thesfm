import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { cleanEnv, getMarketSentimentProviderConfig } from '@/lib/market/providerConfig';
import { loginToMyfxbook } from '@/lib/market/providers/myfxbook';
import { isAdminAccessCodeConfigured, isValidAdminAccessCode } from '@/lib/server/adminAccess';

export const dynamic = 'force-dynamic';

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

export async function GET(request: NextRequest) {
  const healthTokenConfigured = Boolean(cleanEnv(process.env.MARKET_PROVIDER_HEALTH_TOKEN));

  if (!healthTokenConfigured && !isAdminAccessCodeConfigured()) {
    return NextResponse.json({ ok: false, code: 'MYFXBOOK_HEALTH_DISABLED' }, { status: 404 });
  }

  if (!isAllowed(request)) {
    return NextResponse.json({ ok: false, code: 'MYFXBOOK_HEALTH_FORBIDDEN' }, { status: 403 });
  }

  const email = cleanEnv(process.env.MYFXBOOK_EMAIL);
  const password = cleanEnv(process.env.MYFXBOOK_PASSWORD);
  const config = getMarketSentimentProviderConfig();
  const envConfigured = Boolean(email && password);
  const providerIsMyfxbook = config.provider === 'myfxbook';

  console.log('[Myfxbook] env check', {
    provider: config.provider ?? config.providerEnv ?? null,
    hasEmail: Boolean(email),
    hasPassword: Boolean(password),
    emailLength: email.length,
    passwordLength: password.length,
    passwordHasSpecialChars: /[^a-zA-Z0-9]/.test(password),
  });

  const login = envConfigured && providerIsMyfxbook
    ? await loginToMyfxbook({ force: true }).catch(error => ({
        ok: false as const,
        code: 'MYFXBOOK_PROVIDER_FAILED' as const,
        providerMessage: error instanceof Error ? error.message : null,
        httpStatus: undefined,
        canReachMyfxbook: false,
      }))
    : null;

  return NextResponse.json({
    ok: true,
    provider: config.provider ?? config.providerEnv ?? null,
    envConfigured,
    providerIsMyfxbook,
    hasEmail: Boolean(email),
    hasPassword: Boolean(password),
    emailLength: email.length,
    passwordLength: password.length,
    passwordHasSpecialChars: /[^a-zA-Z0-9]/.test(password),
    loginAttempted: Boolean(login),
    loginSuccess: login?.ok ?? false,
    errorType: login && !login.ok ? login.code : envConfigured ? null : 'MYFXBOOK_CREDENTIALS_NOT_CONFIGURED',
    canReachMyfxbook: login?.canReachMyfxbook ?? false,
    providerMessage: login && !login.ok ? maskedProviderMessage(login.providerMessage) : null,
    hasSession: Boolean(login?.ok),
  });
}
