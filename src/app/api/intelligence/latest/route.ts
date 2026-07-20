import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { AnalysisRequest } from '@/domain/intelligence/contracts';
import { latestIntelligenceQuerySchema } from '@/domain/intelligence/schemas';
import {
  INTELLIGENCE_RESPONSE_HEADERS,
  intelligenceErrorResponse,
  mappedIntelligenceErrorResponse,
} from '@/lib/intelligence/api';
import { getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { checkRateLimitWithMetadata, getClientIp } from '@/lib/server/rateLimiter';
import { intelligenceOrchestrator } from '@/services/intelligence/orchestrator';
import { IntelligenceTelemetryCollector } from '@/services/intelligence/telemetry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const correlationId = randomUUID();
  const parsed = latestIntelligenceQuerySchema.safeParse({
    symbol: request.nextUrl.searchParams.get('symbol'),
    assetType: request.nextUrl.searchParams.get('assetType'),
    horizon: request.nextUrl.searchParams.get('horizon') ?? undefined,
    locale: request.nextUrl.searchParams.get('locale') ?? undefined,
  });
  if (!parsed.success) {
    return intelligenceErrorResponse({
      code: 'INVALID_REQUEST',
      correlationId,
      validation: parsed.error.issues,
    });
  }

  const user = await getCurrentUserFromRequest(request).catch(() => null);
  const authenticated = Boolean(user?.id);
  const identity = authenticated ? `user:${user!.id}` : `ip:${getClientIp(request)}`;
  const rateLimit = checkRateLimitWithMetadata(identity, {
    max: authenticated ? 120 : 60,
    windowMs: 60_000,
    prefix: 'intelligence-latest',
  });
  if (!rateLimit.allowed) {
    return intelligenceErrorResponse({ code: 'APPLICATION_RATE_LIMITED', correlationId, retryable: true, retryAfterSeconds: rateLimit.retryAfterSeconds });
  }

  const analysisRequest: AnalysisRequest = {
    userId: user?.id ?? null,
    asset: { symbol: parsed.data.symbol, assetType: parsed.data.assetType },
    horizon: parsed.data.horizon,
    locale: parsed.data.locale,
    requestedModules: [],
    providerPreferences: null,
    source: 'PUBLIC_API',
    correlationId,
    forceRefresh: false,
  };
  const telemetry = new IntelligenceTelemetryCollector({
    correlationId,
    authenticated,
    locale: analysisRequest.locale,
    assetType: analysisRequest.asset.assetType,
    route: '/api/intelligence/latest',
  });

  try {
    const stored = await intelligenceOrchestrator.latest(analysisRequest);
    telemetry.record({ name: stored ? 'intelligence_latest_found' : 'intelligence_latest_not_found' });
    await telemetry.flush();
    if (!stored) {
      return intelligenceErrorResponse({ code: 'NO_SAVED_ANALYSIS', correlationId });
    }
    const result = { ...stored, correlationId };
    return NextResponse.json({ ok: true, result, correlationId }, {
      headers: { ...INTELLIGENCE_RESPONSE_HEADERS, 'X-Correlation-ID': correlationId },
    });
  } catch (error) {
    telemetry.record({ name: 'intelligence_api_failed', failureClass: 'safe_mapped_error' });
    await telemetry.flush();
    return mappedIntelligenceErrorResponse(error, correlationId);
  }
}
