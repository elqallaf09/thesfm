import { NextRequest, NextResponse } from 'next/server';
import { getTraderAccess } from '@/lib/server/traderAccess';
import { parseScannerFilters, scannerSummary, toTraderRecommendation } from '@/lib/trader/apiFormat';
import { filterResults, runScanner } from '@/lib/trader/scannerService';

export const dynamic = 'force-dynamic';

function hasCronSecret(request: NextRequest) {
  const configured = process.env.CRON_SECRET?.trim();
  if (!configured) return false;
  const authorization = request.headers.get('authorization') || '';
  const headerSecret = request.headers.get('x-cron-secret') || '';
  return authorization === `Bearer ${configured}` || headerSecret === configured;
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
  if (typeof body.minimumConfidence === 'number') search.set('minimumConfidence', String(body.minimumConfidence));
  if (Array.isArray(body.symbols)) search.set('symbols', body.symbols.slice(0, 30).join(','));

  const filters = parseScannerFilters(search);
  const results = filterResults(await runScanner(filters, true), filters);
  const recommendations = results.map(toTraderRecommendation);

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    summary: scannerSummary(results),
    recommendations,
    results: recommendations,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function GET(request: NextRequest) {
  if (!hasCronSecret(request)) {
    return NextResponse.json({ error: 'cron_secret_required' }, { status: 403 });
  }

  const results = await runScanner({ market: 'US' }, true);
  const recommendations = results.map(toTraderRecommendation);

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    summary: scannerSummary(results),
    recommendations,
    results: recommendations,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
