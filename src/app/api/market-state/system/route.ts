import { NextResponse } from 'next/server';
import { getMarketSystemState } from '@/lib/market-state/aggregateMarketState';
import { buildFeatureEnvelope } from '@/lib/market-state/envelope';
import { computeCompleteness } from '@/lib/market-state/completeness';
import { computeFreshness } from '@/lib/market-state/freshness';
import { normalizeFeatureDataStatus } from '@/lib/market-state/normalizeStatus';
import type { MarketSystemState } from '@/lib/market-state/types';

export const dynamic = 'force-dynamic';

// Public responses never reveal per-provider identity/errors — only the admin-token request does.
function isAdminDiagnosticsRequest(url: URL, request: Request): boolean {
  const secret = (process.env.ADMIN_DIAGNOSTICS_TOKEN || '').trim();
  if (!secret) return false;
  const provided = url.searchParams.get('adminToken') || request.headers.get('x-admin-diagnostics-token');
  return Boolean(provided) && provided === secret;
}

function publicSystemState(state: MarketSystemState): Pick<MarketSystemState, 'generatedAt' | 'overall' | 'featuresSucceeded' | 'featuresDegraded' | 'featuresFailed' | 'catalog' | 'lastSynchronizedAt'> {
  return {
    generatedAt: state.generatedAt,
    overall: state.overall,
    featuresSucceeded: state.featuresSucceeded,
    featuresDegraded: state.featuresDegraded,
    featuresFailed: state.featuresFailed,
    catalog: state.catalog,
    lastSynchronizedAt: state.lastSynchronizedAt,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceFresh = url.searchParams.get('forceFresh') === '1';
  const isAdmin = isAdminDiagnosticsRequest(url, request);

  const state = await getMarketSystemState({ forceFresh });
  const requestedCapabilities = state.featuresSucceeded.length + state.featuresDegraded.length + state.featuresFailed.length;
  const returnedCapabilities = state.featuresSucceeded.length + state.featuresDegraded.length;

  const envelope = buildFeatureEnvelope({
    feature: 'system',
    status: normalizeFeatureDataStatus({
      isLoading: false,
      hasError: false,
      providerStatus: state.overall,
      requested: requestedCapabilities,
      returned: returnedCapabilities,
    }),
    provider: {
      selected: null,
      attempted: [],
      fallbackUsed: false,
      reason: null,
      context: 'general',
      timestamp: state.generatedAt,
      cached: false,
      delayed: false,
    },
    freshness: computeFreshness(state.lastSynchronizedAt, 'symbols'),
    completeness: computeCompleteness(requestedCapabilities, returnedCapabilities),
    data: isAdmin ? state : publicSystemState(state),
    warnings: [],
    errors: [],
  });

  return NextResponse.json(envelope, { headers: { 'cache-control': 'private, no-store' } });
}
