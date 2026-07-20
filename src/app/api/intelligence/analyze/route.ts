import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { AnalysisRequest } from '@/domain/intelligence/contracts';
import { analyzeIntelligenceInputSchema } from '@/domain/intelligence/schemas';
import {
  INTELLIGENCE_RESPONSE_HEADERS,
  intelligenceErrorResponse,
  mappedIntelligenceErrorResponse,
  readBoundedJson,
} from '@/lib/intelligence/api';
import { getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { checkRateLimitWithMetadata, getClientIp } from '@/lib/server/rateLimiter';
import { intelligenceOrchestrator } from '@/services/intelligence/orchestrator';
import { IntelligenceTelemetryCollector } from '@/services/intelligence/telemetry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const correlationId = randomUUID();
  const startedAt = Date.now();
  let body: unknown;
  try {
    body = await readBoundedJson(request);
  } catch {
    return intelligenceErrorResponse({ code: 'INVALID_REQUEST', correlationId });
  }

  const parsed = analyzeIntelligenceInputSchema.safeParse(body);
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
  const generalLimit = checkRateLimitWithMetadata(identity, {
    max: authenticated ? 30 : 8,
    windowMs: 60_000,
    prefix: 'intelligence-analyze',
  });
  if (!generalLimit.allowed) {
    return intelligenceErrorResponse({
      code: 'APPLICATION_RATE_LIMITED', correlationId, retryable: true, retryAfterSeconds: generalLimit.retryAfterSeconds,
    });
  }
  if (parsed.data.forceRefresh && !authenticated) {
    return intelligenceErrorResponse({ code: 'UNAUTHENTICATED', correlationId });
  }
  const forceLimit = parsed.data.forceRefresh ? checkRateLimitWithMetadata(identity, {
    max: 6,
    windowMs: 60_000,
    prefix: 'intelligence-force-refresh',
  }) : null;
  if (forceLimit && !forceLimit.allowed) {
    return intelligenceErrorResponse({
      code: 'APPLICATION_RATE_LIMITED', correlationId, retryable: true, retryAfterSeconds: forceLimit.retryAfterSeconds,
    });
  }

  const analysisRequest: AnalysisRequest = {
    userId: user?.id ?? null,
    asset: parsed.data.asset,
    horizon: parsed.data.horizon,
    locale: parsed.data.locale,
    requestedModules: parsed.data.requestedModules ?? [],
    providerPreferences: null,
    source: parsed.data.source,
    correlationId,
    forceRefresh: parsed.data.forceRefresh,
  };
  const telemetry = new IntelligenceTelemetryCollector({
    correlationId,
    authenticated,
    locale: analysisRequest.locale,
    assetType: analysisRequest.asset.assetType,
    route: '/api/intelligence/analyze',
  });

  try {
    const result = await intelligenceOrchestrator.analyze(analysisRequest, telemetry);
    telemetry.record({ name: 'intelligence_api_latency', value: Date.now() - startedAt });
    await telemetry.flush();
    return NextResponse.json({ ok: true, result, correlationId }, {
      headers: { ...INTELLIGENCE_RESPONSE_HEADERS, 'X-Correlation-ID': correlationId },
    });
  } catch (error) {
    telemetry.record({ name: 'intelligence_api_failed', failureClass: 'safe_mapped_error' });
    telemetry.record({ name: 'intelligence_api_latency', value: Date.now() - startedAt });
    await telemetry.flush();
    return mappedIntelligenceErrorResponse(error, correlationId);
  }
}
