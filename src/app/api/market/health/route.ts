import { NextResponse } from 'next/server';
import { proxyHealth } from '@/lib/market/marketDataProvider';
import { getMarketSystemState } from '@/lib/market-state/aggregateMarketState';

export async function GET() {
  const health = await proxyHealth();
  // Additive-only field — every existing key above is byte-compatible with current consumers;
  // `state` is the new unified market-state view (see /api/market-state/system for the same
  // canonical shape), safe for any caller to ignore.
  const state = await getMarketSystemState();
  return NextResponse.json({ ...health, state }, { status: health.ok ? 200 : 503 });
}
