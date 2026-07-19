import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { INTELLIGENCE_RESPONSE_HEADERS, intelligenceErrorResponse } from '@/lib/intelligence/api';
import { getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { checkRateLimit, getClientIp } from '@/lib/server/rateLimiter';
import { intelligenceOutcomeReportingService } from '@/services/intelligence/outcomeReporting';
import { IntelligenceTelemetryCollector } from '@/services/intelligence/telemetry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const correlationId = randomUUID();
  const startedAt = Date.now();
  const user = await getCurrentUserFromRequest(request).catch(() => null);
  const authenticated = Boolean(user?.id);
  const identity = authenticated ? `user:${user!.id}` : `ip:${getClientIp(request)}`;
  if (!checkRateLimit(identity, { max: authenticated ? 30 : 15, windowMs: 60_000, prefix: 'intelligence-accuracy' })) {
    return intelligenceErrorResponse({ code: 'RATE_LIMITED', correlationId, retryable: true });
  }
  const requestedLocale = request.nextUrl.searchParams.get('locale');
  const locale: 'ar' | 'en' | 'fr' = requestedLocale === 'en' || requestedLocale === 'fr' ? requestedLocale : 'ar';
  const telemetry = new IntelligenceTelemetryCollector({
    correlationId,
    authenticated,
    locale,
    assetType: 'SYSTEM',
    route: '/api/intelligence/accuracy',
  });
  try {
    const aggregate = await intelligenceOutcomeReportingService.buildSharedCalibration();
    telemetry.record({ name: 'intelligence_calibration_aggregate_generated', count: aggregate.includedOutcomes });
    telemetry.record({ name: 'intelligence_api_latency', value: Date.now() - startedAt });
    await telemetry.flush();
    return NextResponse.json({ ok: true, accuracy: aggregate, correlationId }, {
      headers: { ...INTELLIGENCE_RESPONSE_HEADERS, 'X-Correlation-ID': correlationId },
    });
  } catch {
    telemetry.record({ name: 'intelligence_calibration_aggregate_unavailable', failureClass: 'safe_mapped_error' });
    telemetry.record({ name: 'intelligence_api_latency', value: Date.now() - startedAt });
    await telemetry.flush();
    return intelligenceErrorResponse({ code: 'PERSISTENCE_UNAVAILABLE', correlationId, retryable: true });
  }
}
