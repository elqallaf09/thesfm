import { NextResponse } from 'next/server';
import { fetchAssetProfile } from '@/lib/market/fetchAssetProfile';
import { validateSymbol } from '@/lib/market/marketService';
import { resolveMarketSymbol } from '@/lib/market/symbolResolver';

export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = validateSymbol(searchParams.get('symbol'));
  const assetType = searchParams.get('assetType') ?? searchParams.get('type') ?? undefined;

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

  const resolved = await resolveMarketSymbol(symbol, assetType).catch(() => null);
  const resolvedAsset = resolved?.ok ? resolved.asset : null;
  const providerSymbol = validateSymbol(searchParams.get('providerSymbol'))
    ?? resolvedAsset?.providerSymbol
    ?? symbol;
  const displaySymbol = resolvedAsset?.symbol ?? symbol;

  const response = await fetchAssetProfile({
    symbol: displaySymbol,
    providerSymbol,
    assetType: resolvedAsset?.assetType ?? assetType,
    name: searchParams.get('name') ?? resolvedAsset?.name ?? undefined,
    exchange: searchParams.get('exchange') ?? resolvedAsset?.exchange ?? undefined,
    language: searchParams.get('lang') ?? undefined,
  });

  return NextResponse.json({
    ...response,
    requestedSymbol: symbol,
    providerStatus: {
      provider: response.source,
      providerSymbolUsed: response.providerSymbol ?? providerSymbol,
      fallbackUsed: false,
      lastUpdated: response.lastUpdated,
      dataQuality: response.profileAvailable ? 'partial' : 'unavailable',
    },
  });
}
