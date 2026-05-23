import { NextRequest, NextResponse } from 'next/server';
import { proxyCompare } from '@/lib/market/openbbProxy';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const result = await proxyCompare(searchParams.get('symbols'), searchParams.get('assetType'));

  return NextResponse.json(result);
}
