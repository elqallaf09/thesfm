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
  return cleanEnv(request.headers.get('x-admin-diagnostics-token')) || cleanEnv(bearer);
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

  const config = getMarketSentimentProviderConfig();
  const login = config.provider === 'myfxbook'
    ? await loginToMyfxbook({ force: true }).catch(error => ({
        ok: false as const,
        code: 'MYFXBOOK_PROVIDER_FAILED' as const,
        providerMessage: error instanceof Error ? error.message : null,
      }))
    : null;

  return NextResponse.json({
    ok: true,
    provider: config.provider ?? (config.providerEnv || null),
    configured: config.configured,
    hasEmail: Boolean(cleanEnv(process.env.MYFXBOOK_EMAIL)),
    hasPassword: Boolean(cleanEnv(process.env.MYFXBOOK_PASSWORD)),
    canLogin: login?.ok ?? false,
    code: login && !login.ok ? login.code : null,
    providerMessage: login && !login.ok ? maskedProviderMessage(login.providerMessage) : null,
  });
}
