import { NextRequest, NextResponse } from 'next/server';
import { fetchMarketAnalysis, normalizeAssetType, validateSymbol } from '@/lib/market/marketService';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const symbol = validateSymbol(searchParams.get('symbol'));
  const assetType = normalizeAssetType(searchParams.get('assetType'));

  if (!symbol) {
    return NextResponse.json({ success: false, error: 'Invalid symbol' }, { status: 400 });
  }

  const result = await fetchMarketAnalysis({ symbol, assetType });
  return NextResponse.json(result);
}
