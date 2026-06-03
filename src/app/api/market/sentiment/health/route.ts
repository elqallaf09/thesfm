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
    return NextResponse.json({ ok: false, code: 'SENTIMENT_HEALTH_DISABLED' }, { status: 404 });
  }

  if (!isAllowed(request)) {
    return NextResponse.json({ ok: false, code: 'SENTIMENT_HEALTH_FORBIDDEN' }, { status: 403 });
  }

  console.log('MYFXBOOK_HEALTH_START');
  console.log('Myfxbook env diagnostic:', {
    provider: process.env.MARKET_SENTIMENT_PROVIDER,
    hasEmail: Boolean(cleanEnv(process.env.MYFXBOOK_EMAIL)),
    hasPassword: Boolean(cleanEnv(process.env.MYFXBOOK_PASSWORD)),
    emailLength: cleanEnv(process.env.MYFXBOOK_EMAIL).length,
    passwordLength: cleanEnv(process.env.MYFXBOOK_PASSWORD).length,
    passwordHasSpecialChars: /[^a-zA-Z0-9]/.test(process.env.MYFXBOOK_PASSWORD || ''),
  });

  const config = getMarketSentimentProviderConfig();
  const rawEmail = cleanEnv(process.env.MYFXBOOK_EMAIL);
  const rawPassword = cleanEnv(process.env.MYFXBOOK_PASSWORD);
  const login = config.provider === 'myfxbook'
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
    provider: config.provider ?? (config.providerEnv || null),
    hasEmail: Boolean(rawEmail),
    hasPassword: Boolean(rawPassword),
    emailLength: rawEmail.length,
    passwordLength: rawPassword.length,
    passwordHasSpecialChars: /[^a-zA-Z0-9]/.test(rawPassword),
    canReachMyfxbook: login?.canReachMyfxbook ?? false,
    loginAttempted: config.provider === 'myfxbook' && Boolean(rawEmail && rawPassword),
    loginOk: login?.ok ?? false,
    code: login && !login.ok ? login.code : null,
    providerMessage: login && !login.ok ? maskedProviderMessage(login.providerMessage) : null,
    hasSession: Boolean(login?.ok),
  });
}
