import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth/accessPolicy';
import { INTELLIGENCE_RESPONSE_HEADERS } from '@/lib/intelligence/api';
import { intelligenceOutcomeEvaluator } from '@/services/intelligence/outcomeEvaluator';
import { intelligenceOutcomeReportingService } from '@/services/intelligence/outcomeReporting';
import { IntelligenceTelemetryCollector } from '@/services/intelligence/telemetry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Vercel Cron-only evaluator. It accepts no analysis IDs, prices, symbols, or
 * provider URLs, keeping market-data selection entirely server controlled.
 */
export async function GET(request: NextRequest) {
  const correlationId = randomUUID();
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ ok: false, code: 'UNAUTHORIZED', correlationId }, {
      status: 401,
      headers: { ...INTELLIGENCE_RESPONSE_HEADERS, 'X-Correlation-ID': correlationId },
    });
  }
  const telemetry = new IntelligenceTelemetryCollector({
    correlationId,
    authenticated: true,
    locale: 'en',
    assetType: 'SYSTEM',
    route: '/api/intelligence/outcomes/evaluate',
  });
  try {
    telemetry.record({ name: 'intelligence_outcome_evaluation_started' });
    // Four sequential evaluations keep worst-case provider work inside the
    // cron function budget and avoid an uncontrolled historical-data fan-out.
    const result = await intelligenceOutcomeEvaluator.evaluateEligible({ limit: 4, telemetry });
    const calibration = await intelligenceOutcomeReportingService.buildSharedCalibration();
    telemetry.record({
      name: 'intelligence_calibration_aggregate_generated',
      count: calibration.includedOutcomes,
      supportState: calibration.truncated ? 'unsupported' : 'supported',
    });
    await telemetry.flush();
    return NextResponse.json({
      ok: true,
      result,
      calibration: {
        scope: calibration.scope,
        includedOutcomes: calibration.includedOutcomes,
        truncated: calibration.truncated,
        sampleSufficient: calibration.report.directional.sampleSufficient,
        calibrationBoundary: calibration.report.calibrationBoundary,
      },
      correlationId,
    }, {
      headers: { ...INTELLIGENCE_RESPONSE_HEADERS, 'X-Correlation-ID': correlationId },
    });
  } catch {
    telemetry.record({ name: 'intelligence_outcome_evaluation_failed', failureClass: 'safe_internal_failure' });
    await telemetry.flush();
    return NextResponse.json({ ok: false, code: 'EVALUATION_UNAVAILABLE', correlationId }, {
      status: 503,
      headers: { ...INTELLIGENCE_RESPONSE_HEADERS, 'X-Correlation-ID': correlationId },
    });
  }
}
