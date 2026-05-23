import { NextRequest, NextResponse } from 'next/server';
import { searchMarketAssets } from '@/lib/market/marketService';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const results = await searchMarketAssets({
    query: searchParams.get('query') ?? searchParams.get('q'),
    assetType: searchParams.get('assetType'),
  });

  return NextResponse.json({ success: true, results });
}
