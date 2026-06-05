import { NextRequest, NextResponse } from 'next/server';
import { getFxRate } from '@/lib/market/fxRates';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const result = await getFxRate(searchParams.get('from'), searchParams.get('to'));
  return NextResponse.json({
    ok: result.available,
    ...result,
  }, {
    status: result.available ? 200 : 502,
    headers: { 'Cache-Control': 'no-store' },
  });
}
