import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { AssetDetailsQuote, AssetDetailsResponse } from '@/domain/intelligence/assetDetails';
import { latestIntelligenceQuerySchema } from '@/domain/intelligence/schemas';
import { INTELLIGENCE_RESPONSE_HEADERS, intelligenceErrorResponse, mappedIntelligenceErrorResponse } from '@/lib/intelligence/api';
import { marketAssetTypeFromIntelligence } from '@/lib/intelligence/assetTypes';
import { getQuoteWithFallback } from '@/lib/market/marketDataProviders';
import { checkRateLimitWithMetadata, getClientIp } from '@/lib/server/rateLimiter';
import { resolveCanonicalIntelligenceAsset } from '@/services/intelligence/assetResolver';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null;

export async function GET(request: NextRequest) {
  const correlationId = randomUUID();
  const parsed = latestIntelligenceQuerySchema.pick({ symbol: true, assetType: true }).safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return intelligenceErrorResponse({ code: 'INVALID_REQUEST', correlationId });
  const limit = checkRateLimitWithMetadata(`ip:${getClientIp(request)}`, { max: 20, windowMs: 60_000, prefix: 'intelligence-asset-details' });
  if (!limit.allowed) return intelligenceErrorResponse({ code: 'APPLICATION_RATE_LIMITED', correlationId, retryable: true, retryAfterSeconds: limit.retryAfterSeconds });
  try {
    const asset = await resolveCanonicalIntelligenceAsset(parsed.data);
    const result = await getQuoteWithFallback(asset.providerSymbol, asset.market, {
      symbol: asset.displaySymbol, assetType: marketAssetTypeFromIntelligence(asset.assetType),
      name: asset.name, exchange: asset.exchange, country: asset.country, currency: asset.quoteCurrency,
    }).catch(() => null);
    let quote: AssetDetailsQuote | null = null;
    if (result?.ok && finite(result.data.price) !== null && result.data.price > 0) {
      const data = result.data;
      quote = {
        price: data.price, currency: data.currency, change: finite(data.change), changePercent: finite(data.changePercent),
        open: finite(data.open), high: finite(data.high), low: finite(data.low), previousClose: finite(data.previousClose), volume: finite(data.volume),
        source: data.providerName || data.provider,
        observedAt: data.lastUpdated && Number.isFinite(Date.parse(data.lastUpdated)) ? new Date(data.lastUpdated).toISOString() : null,
        delay: data.cached ? 'cached' : data.delayType,
      };
    }
    // Identity can remain available when price providers fail. Do not fill
    // absent OHLC/volume with zero or fabricate technicals from a lone quote.
    const body: AssetDetailsResponse = { ok: true, asset, quote, quoteStatus: quote ? 'available' : 'unavailable', fetchedAt: new Date().toISOString(), correlationId };
    return NextResponse.json(body, { headers: { ...INTELLIGENCE_RESPONSE_HEADERS, 'X-Correlation-ID': correlationId } });
  } catch (error) {
    return mappedIntelligenceErrorResponse(error, correlationId);
  }
}
