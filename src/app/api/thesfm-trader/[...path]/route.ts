import { NextRequest, NextResponse } from 'next/server';
import { getTraderAccess } from '@/lib/server/traderAccess';
import { parseScannerFilters, scannerSummary, toTraderRecommendation } from '@/lib/trader/apiFormat';
import { buildTraderHealthPayload, normalizeTraderCompatPath, TRADER_MARKET_CATEGORIES } from '@/lib/trader/compatApi';
import { filterResults, getScannerResults, getTraderStatus, runScanner } from '@/lib/trader/scannerService';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ path?: string[] }> };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function hasCronSecret(request: NextRequest) {
  const configured = process.env.CRON_SECRET?.trim();
  if (!configured) return false;
  const authorization = request.headers.get('authorization') || '';
  const headerSecret = request.headers.get('x-cron-secret') || '';
  return authorization === `Bearer ${configured}` || headerSecret === configured;
}

function accessError(access: Awaited<ReturnType<typeof getTraderAccess>>) {
  return json(
    { error: access.reason === 'unauthenticated' ? 'unauthenticated' : 'trader_access_denied' },
    access.reason === 'unauthenticated' ? 401 : 403,
  );
}

async function scannerResultsPayload(request: NextRequest) {
  const filters = parseScannerFilters(request.nextUrl.searchParams);
  const results = await getScannerResults(filters);
  const recommendations = results.map(toTraderRecommendation);
  return {
    ok: true,
    market: 'US',
    generatedAt: getTraderStatus().scanner.lastScanCompletedAt || new Date().toISOString(),
    summary: scannerSummary(results),
    recommendations,
    results: recommendations,
    status: getTraderStatus(),
  };
}

async function usStocksPayload(request: NextRequest) {
  const payload = await scannerResultsPayload(request);
  const recommendations = payload.recommendations;
  return {
    ...payload,
    stocks: recommendations,
    topGainers: [...recommendations].sort((a, b) => Number(b.expectedMovePct || 0) - Number(a.expectedMovePct || 0)).slice(0, 5),
    topLosers: [...recommendations].sort((a, b) => Number(a.expectedMovePct || 0) - Number(b.expectedMovePct || 0)).slice(0, 5),
    mostActive: [...recommendations].sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0)).slice(0, 8),
  };
}

async function scannerRunPayload(request: NextRequest) {
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
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    summary: scannerSummary(results),
    recommendations,
    results: recommendations,
    status: getTraderStatus(),
  };
}

async function handleTraderCompatApi(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const parts = normalizeTraderCompatPath(params.path ?? []);
  const key = parts.join('/');

  if (key === 'health') {
    return json(buildTraderHealthPayload(getTraderStatus()));
  }

  if (!parts.length) {
    return json({
      ok: true,
      routes: ['health', 'status', 'markets', 'recommendations', 'us-stocks', 'scanner/results', 'scanner/run'],
    });
  }

  const access = await getTraderAccess();
  const cronAuthorized = hasCronSecret(request);
  if (!access.allowed && !cronAuthorized) return accessError(access);

  try {
    if (key === 'status') return json(getTraderStatus());
    if (key === 'markets') {
      return json({
        ok: true,
        markets: TRADER_MARKET_CATEGORIES,
        generatedAt: new Date().toISOString(),
        status: getTraderStatus(),
      });
    }
    if (key === 'recommendations' || key === 'scanner/results') return json(await scannerResultsPayload(request));
    if (key === 'us-stocks') return json(await usStocksPayload(request));

    if (key === 'scanner/run') {
      if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
      if (access.allowed && !access.isAdmin && !cronAuthorized) return json({ error: 'manual_scan_requires_admin' }, 403);
      return json(await scannerRunPayload(request));
    }

    return json({ error: 'TRADER_LEGACY_ROUTE_NOT_FOUND' }, 404);
  } catch {
    return json({ error: 'TRADER_UPSTREAM_ERROR', message: 'Trader service is temporarily unavailable.' }, 503);
  }
}

export function GET(request: NextRequest, context: RouteContext) {
  return handleTraderCompatApi(request, context);
}

export function POST(request: NextRequest, context: RouteContext) {
  return handleTraderCompatApi(request, context);
}

export function PUT() {
  return json({ error: 'method_not_allowed' }, 405);
}

export function PATCH() {
  return json({ error: 'method_not_allowed' }, 405);
}

export function DELETE() {
  return json({ error: 'method_not_allowed' }, 405);
}
