import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { intelligenceTimelineQuerySchema } from '@/domain/intelligence/schemas';
import {
  INTELLIGENCE_RESPONSE_HEADERS,
  intelligenceErrorResponse,
  mappedIntelligenceErrorResponse,
} from '@/lib/intelligence/api';
import { getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { checkRateLimitWithMetadata, getClientIp } from '@/lib/server/rateLimiter';
import { resolveCanonicalIntelligenceAsset } from '@/services/intelligence/assetResolver';
import { IntelligenceTelemetryCollector } from '@/services/intelligence/telemetry';
import { intelligenceTimelineService } from '@/services/intelligence/timeline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function queryValue(request: NextRequest, key: string) {
  return request.nextUrl.searchParams.get(key) ?? undefined;
}

export async function GET(request: NextRequest) {
  const correlationId = randomUUID();
  const startedAt = Date.now();
  const parsed = intelligenceTimelineQuerySchema.safeParse({
    symbol: queryValue(request, 'symbol'),
    assetType: queryValue(request, 'assetType'),
    horizon: queryValue(request, 'horizon'),
    locale: queryValue(request, 'locale'),
    from: queryValue(request, 'from'),
    to: queryValue(request, 'to'),
    cursor: queryValue(request, 'cursor'),
    limit: queryValue(request, 'limit'),
    analysisId: queryValue(request, 'analysisId'),
    compareAnalysisId: queryValue(request, 'compareAnalysisId'),
  });
  if (!parsed.success) {
    return intelligenceErrorResponse({ code: 'INVALID_REQUEST', correlationId, validation: parsed.error.issues });
  }

  const user = await getCurrentUserFromRequest(request).catch(() => null);
  const authenticated = Boolean(user?.id);
  if (!authenticated) return intelligenceErrorResponse({ code: 'UNAUTHENTICATED', correlationId });
  const identity = authenticated ? `user:${user!.id}` : `ip:${getClientIp(request)}`;
  const timelineLimit = checkRateLimitWithMetadata(identity, {
    max: 120,
    windowMs: 60_000,
    prefix: 'intelligence-timeline',
  });
  if (!timelineLimit.allowed) {
    return intelligenceErrorResponse({ code: 'APPLICATION_RATE_LIMITED', correlationId, retryable: true, retryAfterSeconds: timelineLimit.retryAfterSeconds });
  }
  const comparisonLimit = parsed.data.analysisId ? checkRateLimitWithMetadata(identity, {
    max: 30,
    windowMs: 60_000,
    prefix: 'intelligence-timeline-comparison',
  }) : null;
  if (comparisonLimit && !comparisonLimit.allowed) {
    return intelligenceErrorResponse({ code: 'APPLICATION_RATE_LIMITED', correlationId, retryable: true, retryAfterSeconds: comparisonLimit.retryAfterSeconds });
  }

  const telemetry = new IntelligenceTelemetryCollector({
    correlationId,
    authenticated,
    locale: parsed.data.locale,
    assetType: parsed.data.assetType,
    route: '/api/intelligence/timeline',
  });
  try {
    const asset = await resolveCanonicalIntelligenceAsset({
      symbol: parsed.data.symbol,
      assetType: parsed.data.assetType,
    });
    const query = {
      asset: { canonicalSymbol: asset.canonicalSymbol, assetType: asset.assetType },
      horizon: parsed.data.horizon,
      userId: user?.id ?? null,
      from: parsed.data.from ?? null,
      to: parsed.data.to ?? null,
      cursor: parsed.data.cursor ?? null,
      limit: parsed.data.limit,
    };
    telemetry.record({ name: 'intelligence_timeline_requested' });
    const timeline = await intelligenceTimelineService.getTimeline(query);
    const comparison = parsed.data.analysisId && parsed.data.compareAnalysisId
      ? await intelligenceTimelineService.compare({
        leftAnalysisId: parsed.data.analysisId,
        rightAnalysisId: parsed.data.compareAnalysisId,
        userId: user?.id ?? null,
        asset: query.asset,
        horizon: query.horizon,
      })
      : null;
    if (parsed.data.analysisId && !comparison) {
      telemetry.record({ name: 'intelligence_timeline_comparison_denied', failureClass: 'analysis_not_found_or_not_allowed' });
      telemetry.record({ name: 'intelligence_api_latency', value: Date.now() - startedAt });
      await telemetry.flush();
      return intelligenceErrorResponse({ code: 'ANALYSIS_NOT_FOUND', correlationId });
    }
    if (comparison) telemetry.record({ name: 'intelligence_timeline_comparison_requested' });
    telemetry.record({ name: 'intelligence_api_latency', value: Date.now() - startedAt });
    await telemetry.flush();
    return NextResponse.json({
      ok: true,
      timeline: {
        ...timeline,
        ...(comparison ? { comparison } : {}),
      },
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
