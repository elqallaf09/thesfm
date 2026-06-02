import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  cleanEnv,
  getCentralBankNewsProviderConfig,
  getMarketSentimentProviderConfig,
} from '@/lib/market/providerConfig';
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

export async function GET(request: NextRequest) {
  const healthTokenConfigured = Boolean(cleanEnv(process.env.MARKET_PROVIDER_HEALTH_TOKEN));

  if (!healthTokenConfigured && !isAdminAccessCodeConfigured()) {
    return NextResponse.json({ ok: false, code: 'PROVIDER_HEALTH_DISABLED' }, { status: 404 });
  }

  if (!isAllowed(request)) {
    return NextResponse.json({ ok: false, code: 'PROVIDER_HEALTH_FORBIDDEN' }, { status: 403 });
  }

  const centralBankNews = getCentralBankNewsProviderConfig();
  const marketSentiment = getMarketSentimentProviderConfig();

  return NextResponse.json({
    ok: true,
    centralBankNews: {
      configured: centralBankNews.configured,
      provider: centralBankNews.provider,
      providerEnvConfigured: centralBankNews.providerEnvConfigured,
      hasCentralBankNewsApiKey: centralBankNews.hasCentralBankNewsApiKey,
      hasNewsApiKey: centralBankNews.hasNewsApiKey,
    },
    marketSentiment: {
      configured: marketSentiment.configured,
      provider: marketSentiment.provider,
      providerEnvConfigured: marketSentiment.providerEnvConfigured,
      hasMarketSentimentApiKey: marketSentiment.hasMarketSentimentApiKey,
      hasFinnhubApiKey: marketSentiment.hasFinnhubApiKey,
      hasAlphaVantageApiKey: marketSentiment.hasAlphaVantageApiKey,
    },
  });
}
