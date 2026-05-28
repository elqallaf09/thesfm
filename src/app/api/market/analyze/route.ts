import { NextRequest, NextResponse } from 'next/server';
import { proxyAnalyze } from '@/lib/market/openbbProxy';

function statusForCode(code?: string) {
  if (code === 'openbb_timeout') return 408;
  if (code === 'symbol_not_found') return 404;
  if (code === 'invalid_symbol' || code === 'provider_no_data' || code === 'response_mapping_failed') return 422;
  if (code === 'openbb_unreachable' || code === 'provider_error') return 503;
  return 400;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const result = await proxyAnalyze(searchParams.get('symbol'), searchParams.get('assetType'), {
    displaySymbol: searchParams.get('displaySymbol'),
    name: searchParams.get('name'),
  });
  return NextResponse.json(result, { status: result.success ? 200 : statusForCode(result.code) });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const result = await proxyAnalyze(body?.symbol, body?.assetType, {
    displaySymbol: body?.displaySymbol ?? body?.symbol,
    name: body?.name,
  });
  return NextResponse.json(result, { status: result.success ? 200 : statusForCode(result.code) });
}
