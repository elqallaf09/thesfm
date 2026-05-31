import { NextResponse } from 'next/server';
import { fetchAssetProfile } from '@/lib/market/fetchAssetProfile';
import { validateSymbol } from '@/lib/market/marketService';

export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = validateSymbol(searchParams.get('symbol'));

  if (!symbol) {
    return NextResponse.json(
      {
        success: false,
        error: 'invalid_symbol',
        message: 'A valid symbol is required.',
      },
      { status: 400 },
    );
  }

  const response = await fetchAssetProfile({
    symbol,
    providerSymbol: searchParams.get('providerSymbol') ?? undefined,
    assetType: searchParams.get('assetType') ?? searchParams.get('type') ?? 'stock',
    name: searchParams.get('name') ?? undefined,
    exchange: searchParams.get('exchange') ?? undefined,
    language: searchParams.get('lang') ?? undefined,
  });

  return NextResponse.json({
    ...response,
    companyProfile: response.profile,
  });
}
