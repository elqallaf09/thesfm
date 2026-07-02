import { NextResponse } from 'next/server';
import { createMarketFeatureDiagnostic } from '@/lib/market/featureDiagnostics';
import { fetchAssetProfile } from '@/lib/market/fetchAssetProfile';
import { classifyShariahCompliance, shariahClassificationFields } from '@/lib/market/shariah-screening';
import { validateSymbol } from '@/lib/market/marketService';
import { resolveMarketSymbol } from '@/lib/market/symbolResolver';
import { normalizeTraderSymbolMetadata } from '@/lib/trader/marketMetadata';

export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = validateSymbol(searchParams.get('symbol'));
  const assetType = searchParams.get('assetType') ?? searchParams.get('type') ?? undefined;

  if (!symbol) {
    const diagnostic = createMarketFeatureDiagnostic({
      feature: 'company_profiles',
      provider: null,
      providerStatus: 'provider_error',
      data: [],
      message: 'A valid symbol is required.',
    });
    return NextResponse.json(
      {
        ...diagnostic,
        success: false,
        error: 'invalid_symbol',
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
  const metadata = normalizeTraderSymbolMetadata({
    symbol: displaySymbol,
    displaySymbol,
    provider: response.source,
    providerSymbol: response.providerSymbol ?? providerSymbol,
    assetType: resolvedAsset?.assetType ?? response.assetType ?? assetType,
    quote: response.profile as Record<string, unknown> | null,
    catalog: resolvedAsset as Record<string, unknown> | null,
  });
  const shariah = shariahClassificationFields(classifyShariahCompliance({
    symbol: displaySymbol,
    name: response.profile?.name ?? searchParams.get('name') ?? resolvedAsset?.name ?? displaySymbol,
    assetType: response.assetType,
    exchange: response.profile?.exchange ?? resolvedAsset?.exchange ?? searchParams.get('exchange'),
    country: response.profile?.country ?? resolvedAsset?.country,
    sector: response.profile?.sector,
    industry: response.profile?.industry,
    businessDescription: response.profile?.description ?? response.profile?.objective,
    shariahScreeningData: {
      holdings: response.profile?.topHoldings?.map(holding => ({
        symbol: holding.symbol,
        weight: holding.weight,
        shariahStatus: 'unclassified',
      })),
      sector: response.profile?.sector,
      industry: response.profile?.industry,
      businessDescription: response.profile?.description ?? response.profile?.objective,
    },
  }));
  const profile = response.profile ? { ...response.profile, ...shariah } : response.profile;
  const diagnostic = createMarketFeatureDiagnostic({
    feature: 'company_profiles',
    provider: response.source,
    providerStatus: response.profileAvailable ? 'available' : 'empty',
    data: profile ? [profile] : [],
    message: response.message,
    lastUpdated: response.lastUpdated,
  });

  return NextResponse.json({
    ...response,
    profile,
    ...shariah,
    ...diagnostic,
    requestedSymbol: symbol,
    providerStatus: {
      provider: response.source,
      providerSymbolUsed: response.providerSymbol ?? providerSymbol,
      fallbackUsed: false,
      lastUpdated: response.lastUpdated,
      dataQuality: response.profileAvailable ? 'partial' : 'unavailable',
    },
    providerMessage: response.message,
    displaySymbol: metadata.displaySymbol ?? displaySymbol,
    providerSymbol: metadata.providerSymbol ?? response.providerSymbol ?? providerSymbol,
    exchange: metadata.exchange,
    exchangeCode: metadata.exchangeCode,
    market: metadata.market,
    country: metadata.country,
    currency: metadata.currency,
    assetType: metadata.assetType ?? resolvedAsset?.assetType ?? response.assetType ?? assetType,
    metadataDiagnostics: metadata.diagnostics,
  });
}
