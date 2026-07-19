import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { latestIntelligenceOutcomeQuerySchema } from '@/domain/intelligence/schemas';
import {
  INTELLIGENCE_RESPONSE_HEADERS,
  intelligenceErrorResponse,
  mappedIntelligenceErrorResponse,
} from '@/lib/intelligence/api';
import { getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { checkRateLimit, getClientIp } from '@/lib/server/rateLimiter';
import { resolveCanonicalIntelligenceAsset } from '@/services/intelligence/assetResolver';
import { IntelligenceTelemetryCollector } from '@/services/intelligence/telemetry';
import { intelligenceTimelineService } from '@/services/intelligence/timeline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const correlationId = randomUUID();
  const startedAt = Date.now();
  const parsed = latestIntelligenceOutcomeQuerySchema.safeParse({
    symbol: request.nextUrl.searchParams.get('symbol'),
    assetType: request.nextUrl.searchParams.get('assetType'),
    horizon: request.nextUrl.searchParams.get('horizon') ?? undefined,
    locale: request.nextUrl.searchParams.get('locale') ?? undefined,
  });
  if (!parsed.success) {
    return intelligenceErrorResponse({ code: 'INVALID_REQUEST', correlationId, validation: parsed.error.issues });
  }
  const user = await getCurrentUserFromRequest(request).catch(() => null);
  const authenticated = Boolean(user?.id);
  const identity = authenticated ? `user:${user!.id}` : `ip:${getClientIp(request)}`;
  if (!checkRateLimit(identity, {
    max: authenticated ? 120 : 60,
    windowMs: 60_000,
    prefix: 'intelligence-outcomes-latest',
  })) {
    return intelligenceErrorResponse({ code: 'RATE_LIMITED', correlationId, retryable: true });
  }
  const telemetry = new IntelligenceTelemetryCollector({
    correlationId,
    authenticated,
    locale: parsed.data.locale,
    assetType: parsed.data.assetType,
    route: '/api/intelligence/outcomes/latest',
  });
  try {
    const asset = await resolveCanonicalIntelligenceAsset({
      symbol: parsed.data.symbol,
      assetType: parsed.data.assetType,
    });
    const latest = await intelligenceTimelineService.latestOutcome({
      userId: user?.id ?? null,
      asset: { canonicalSymbol: asset.canonicalSymbol, assetType: asset.assetType },
      horizon: parsed.data.horizon,
    });
    telemetry.record({ name: latest ? 'intelligence_latest_outcome_found' : 'intelligence_latest_outcome_not_found' });
    telemetry.record({ name: 'intelligence_api_latency', value: Date.now() - startedAt });
    await telemetry.flush();
    if (!latest) return intelligenceErrorResponse({ code: 'ANALYSIS_NOT_FOUND', correlationId });
    return NextResponse.json({
      ok: true,
      latest,
      outcome: latest.outcome,
      outcomeStatus: latest.outcomeStatus,
      correlationId,
    }, {
      headers: { ...INTELLIGENCE_RESPONSE_HEADERS, 'X-Correlation-ID': correlationId },
    });
  } catch (error) {
    telemetry.record({ name: 'intelligence_api_failed', failureClass: 'safe_mapped_error' });
    telemetry.record({ name: 'intelligence_api_latency', value: Date.now() - startedAt });
    await telemetry.flush();
    return mappedIntelligenceErrorResponse(error, correlationId);
  }
}
