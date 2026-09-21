import { NextResponse } from 'next/server';
import { applyGoldWhatIf } from '@/lib/gold-intelligence/core';
import { buildGoldScenarioSnapshot } from '@/lib/gold-intelligence/server';
import type { GoldWhatIfRequest } from '@/lib/gold-intelligence/types';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function failure(error: unknown) {
  const code = error instanceof Error && error.message === 'GOLD_PRICE_UNAVAILABLE'
    ? 'GOLD_PRICE_UNAVAILABLE' : 'GOLD_SCENARIO_ENGINE_UNAVAILABLE';
  return NextResponse.json({
    success: false,
    code,
    message: code === 'GOLD_PRICE_UNAVAILABLE'
      ? 'Verified gold price data is currently unavailable.'
      : 'Gold scenario analysis is temporarily unavailable.',
  }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { max: 45, prefix: 'gold-intelligence-get' });
  if (limited) return limited;
  try {
    const snapshot = await buildGoldScenarioSnapshot();
    return NextResponse.json({ success: true, snapshot }, {
      headers: { 'Cache-Control': 'private, max-age=0, s-maxage=60, stale-while-revalidate=180' },
    });
  } catch (error) {
    console.error('[GoldScenarioEngine] GET failed', { message: error instanceof Error ? error.message : String(error) });
    return failure(error);
  }
}

export async function POST(request: Request) {
  const limited = rateLimitRequest(request, { max: 30, prefix: 'gold-intelligence-simulate' });
  if (limited) return limited;
  let body: GoldWhatIfRequest;
  try {
    const parsed = await request.json();
    body = parsed && typeof parsed === 'object' ? parsed as GoldWhatIfRequest : {};
  } catch {
    return NextResponse.json({ success: false, code: 'INVALID_REQUEST' }, { status: 400 });
  }
  try {
    const snapshot = await buildGoldScenarioSnapshot();
    const simulation = applyGoldWhatIf(snapshot, body);
    return NextResponse.json({ success: true, snapshot, simulation }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[GoldScenarioEngine] POST failed', { message: error instanceof Error ? error.message : String(error) });
    return failure(error);
  }
}
