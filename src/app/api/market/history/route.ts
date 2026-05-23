import { NextRequest, NextResponse } from 'next/server';
import { proxyHistory } from '@/lib/market/openbbProxy';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const result = await proxyHistory(searchParams.get('symbol'), searchParams.get('assetType'), searchParams.get('period'));
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
