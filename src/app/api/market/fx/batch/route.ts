import { NextRequest, NextResponse } from 'next/server';
import { getFxRates } from '@/lib/market/fxRates';

export const dynamic = 'force-dynamic';

type FxPair = {
  from?: unknown;
  to?: unknown;
};

export async function POST(request: NextRequest) {
  let pairs: FxPair[] = [];
  try {
    const body = await request.json();
    pairs = Array.isArray(body) ? body : Array.isArray(body?.pairs) ? body.pairs : [];
  } catch {
    pairs = [];
  }

  if (!pairs.length) {
    return NextResponse.json({ ok: false, rates: [], error: 'NO_FX_PAIRS' }, { status: 400 });
  }

  const rates = await getFxRates(pairs.slice(0, 24).map(pair => ({ from: pair.from, to: pair.to })));
  return NextResponse.json({
    ok: rates.every(rate => rate.available),
    rates,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
