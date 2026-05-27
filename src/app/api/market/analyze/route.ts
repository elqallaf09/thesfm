import { NextRequest, NextResponse } from 'next/server';
import { proxyAnalyze } from '@/lib/market/openbbProxy';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const result = await proxyAnalyze(searchParams.get('symbol'), searchParams.get('assetType'), {
    displaySymbol: searchParams.get('displaySymbol'),
    name: searchParams.get('name'),
  });
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const result = await proxyAnalyze(body?.symbol, body?.assetType, {
    displaySymbol: body?.displaySymbol ?? body?.symbol,
    name: body?.name,
  });
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
