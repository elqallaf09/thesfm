import { NextRequest, NextResponse } from 'next/server';
import { proxyHistory } from '@/lib/market/openbbProxy';

function statusForCode(code?: string) {
  if (code === 'openbb_timeout') return 408;
  if (code === 'invalid_symbol' || code === 'provider_no_data') return 422;
  if (code === 'openbb_unreachable' || code === 'provider_error') return 503;
  return 400;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const result = await proxyHistory(searchParams.get('symbol'), searchParams.get('assetType'), searchParams.get('period'));
  return NextResponse.json(result, { status: result.success ? 200 : statusForCode(result.code) });
}
