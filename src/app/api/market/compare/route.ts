import { NextRequest, NextResponse } from 'next/server';
import { compareMarketAssets } from '@/lib/market/marketService';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const results = await compareMarketAssets(searchParams.get('symbols'), searchParams.get('assetType'));

  return NextResponse.json({ success: true, results });
}
