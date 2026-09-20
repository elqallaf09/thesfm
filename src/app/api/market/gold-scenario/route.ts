import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getGoldScenarioSnapshot } from '@/lib/gold-scenario/service';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WhatIfSchema = z.object({
  dollarIndexPct: z.number().min(-15).max(15).optional(),
  oilPct: z.number().min(-40).max(40).optional(),
  policyRateBps: z.number().min(-300).max(300).optional(),
  inflationSurprisePct: z.number().min(-3).max(3).optional(),
  geopoliticalRisk: z.number().min(-100).max(100).optional(),
}).strict();

export async function GET(request: NextRequest) {
  const limited = rateLimitRequest(request, { max: 45, windowMs: 60_000, prefix: 'gold-scenario' });
  if (limited) return limited;

  try {
    const snapshot = await getGoldScenarioSnapshot();
    return NextResponse.json({
      success: true,
      snapshot,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=240',
      },
    });
  } catch (error) {
    console.error('[GoldScenarioEngine] Failed to build baseline snapshot', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({
      success: false,
      code: 'GOLD_SCENARIO_UNAVAILABLE',
      error: 'Gold scenario analysis is temporarily unavailable.',
    }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}

export async function POST(request: NextRequest) {
  const limited = rateLimitRequest(request, { max: 24, windowMs: 60_000, prefix: 'gold-scenario-what-if' });
  if (limited) return limited;

  const payload = await request.json().catch(() => null);
  const parsed = WhatIfSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({
      success: false,
      code: 'INVALID_WHAT_IF_INPUT',
      error: 'The what-if scenario contains invalid values.',
    }, {
      status: 400,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  try {
    const snapshot = await getGoldScenarioSnapshot(parsed.data);
    return NextResponse.json({
      success: true,
      snapshot,
      whatIf: parsed.data,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[GoldScenarioEngine] Failed to build what-if snapshot', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({
      success: false,
      code: 'GOLD_SCENARIO_UNAVAILABLE',
      error: 'Gold scenario analysis is temporarily unavailable.',
    }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
