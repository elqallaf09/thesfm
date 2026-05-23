import { NextRequest, NextResponse } from 'next/server';
import { proxySearch } from '@/lib/market/openbbProxy';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const result = await proxySearch(searchParams.get('query') ?? searchParams.get('q'), searchParams.get('assetType'));

  return NextResponse.json(result);
}
