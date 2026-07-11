import { NextResponse } from 'next/server';
import { getAdminAccessForUser, getCurrentUserFromRequest, hasAdminPermission } from '@/lib/server/adminAccess';
import { getMarketSystemState } from '@/lib/market-state/aggregateMarketState';
import { buildFeatureEnvelope } from '@/lib/market-state/envelope';
import { computeCompleteness } from '@/lib/market-state/completeness';
import { computeFreshness } from '@/lib/market-state/freshness';
import { normalizeFeatureDataStatus } from '@/lib/market-state/normalizeStatus';
import type { MarketSystemState, ProviderCapabilityCell } from '@/lib/market-state/types';

export const dynamic = 'force-dynamic';

// Admin-only extras (raw error text, env-var configuration status) are gated by EITHER an
// authenticated admin session (the normal browser path — every /market-analysis visitor who
// happens to be an admin still gets the richer view) OR the diagnostics token (for
// server-to-server/CLI checks). A client can never safely embed ADMIN_DIAGNOSTICS_TOKEN, so the
// token-only check alone left every browser-side admin page seeing the stripped public payload.
function isTokenDiagnosticsRequest(url: URL, request: Request): boolean {
  const secret = (process.env.ADMIN_DIAGNOSTICS_TOKEN || '').trim();
  if (!secret) return false;
  const provided = url.searchParams.get('adminToken') || request.headers.get('x-admin-diagnostics-token');
  return Boolean(provided) && provided === secret;
}

async function isSessionAdminRequest(request: Request): Promise<boolean> {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) return false;
    const access = await getAdminAccessForUser(user);
    return hasAdminPermission(access);
  } catch {
    return false;
  }
}

function stripCellForPublic(cell: ProviderCapabilityCell): ProviderCapabilityCell {
  return { ...cell, lastErrorReason: null };
}

/**
 * Public payload is now the REAL provider/capability view (display-safe — provider ids and
 * capability ids are not secrets, and every UI consumer routes them through
 * traderProviderDisplayName()/translations, never raw interpolation) minus admin-only extras:
 * free-text error reasons (may echo upstream error strings) and the configuration env-var list.
 * Previously this stripped `providers`/`capabilityMatrix` entirely, leaving nothing for a real
 * /market-analysis user to see even after the header was mounted there.
 */
function publicSystemState(state: MarketSystemState): MarketSystemState {
  return {
    ...state,
    capabilityMatrix: state.capabilityMatrix.map(stripCellForPublic),
    configuration: null,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceFresh = url.searchParams.get('forceFresh') === '1';
  const isAdmin = isTokenDiagnosticsRequest(url, request) || await isSessionAdminRequest(request);

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
