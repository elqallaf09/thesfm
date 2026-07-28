import { NextRequest, NextResponse } from 'next/server';
import { getTraderAccess } from '@/lib/server/traderAccess';
import {
  filterTraderRecommendationsBySharia,
  parseScannerFilters,
  toTraderRecommendation,
  traderRecommendationSummary,
} from '@/lib/trader/apiFormat';
import { filterResults, triggerScan } from '@/lib/trader/scannerService';
import type { ScannerFilters } from '@/lib/trader/types';

export const dynamic = 'force-dynamic';
// Vercel Pro plan maximum for this route. The scanner enforces its own
// internal SCANNER_TIME_BUDGET_MS deadline well below this so it always
// returns a truthful partial/completed response instead of a 504.
export const maxDuration = 300;

function hasCronSecret(request: NextRequest) {
  const configured = process.env.CRON_SECRET?.trim();
  if (!configured) return false;
  const authorization = request.headers.get('authorization') || '';
  const headerSecret = request.headers.get('x-cron-secret') || '';
  return authorization === `Bearer ${configured}` || headerSecret === configured;
}

async function buildScanResponse(filters: ScannerFilters, force: boolean) {
  const { results, run } = await triggerScan(filters, { force });
  const filtered = filterResults(results, filters);
  const recommendations = filterTraderRecommendationsBySharia(filtered.map(toTraderRecommendation), filters.shariaStatus);

  return NextResponse.json({
    ok: run.status !== 'failed',
    status: run.status,
    runId: run.runId,
    processed: run.processed,
    remaining: run.remaining,
    succeeded: run.succeeded,
    skipped: run.skipped,
    failed: run.failed,
    durationMs: run.durationMs,
    nextCursor: run.nextCursor,
    generatedAt: new Date().toISOString(),
    summary: traderRecommendationSummary(recommendations),
    recommendations,
    results: recommendations,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: NextRequest) {
  const access = await getTraderAccess();
  if (!access.allowed && !hasCronSecret(request)) {
    return NextResponse.json(
      { error: access.reason === 'unauthenticated' ? 'unauthenticated' : 'trader_access_denied' },
      { status: access.reason === 'unauthenticated' ? 401 : 403 },
    );
  }
  if (access.allowed && !access.isAdmin && !hasCronSecret(request)) {
    return NextResponse.json({ error: 'manual_scan_requires_admin' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const search = new URLSearchParams();
  if (typeof body.signalType === 'string') search.set('signalType', body.signalType);
  if (typeof body.riskLevel === 'string') search.set('riskLevel', body.riskLevel);
  if (typeof body.timeHorizon === 'string') search.set('timeHorizon', body.timeHorizon);
  if (typeof body.sharia_status === 'string') search.set('sharia_status', body.sharia_status);
  if (typeof body.shariaStatus === 'string') search.set('shariaStatus', body.shariaStatus);
  if (typeof body.minimumConfidence === 'number') search.set('minimumConfidence', String(body.minimumConfidence));
  if (Array.isArray(body.symbols)) search.set('symbols', body.symbols.join(','));
  if (typeof body.cursor === 'number') search.set('cursor', String(body.cursor));

  const filters = parseScannerFilters(search);
  return buildScanResponse(filters, true);
}

export async function GET(request: NextRequest) {
  if (!hasCronSecret(request)) {
    return NextResponse.json({ error: 'cron_secret_required' }, { status: 403 });
  }

  return buildScanResponse({ market: 'US' }, true);
}
