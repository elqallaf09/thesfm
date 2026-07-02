import { NextResponse } from 'next/server';
import { createMarketFeatureDiagnostic } from '@/lib/market/featureDiagnostics';
import { fetchAssetProfile } from '@/lib/market/fetchAssetProfile';
import { classifyShariahCompliance, shariahClassificationFields } from '@/lib/market/shariah-screening';
import { validateSymbol } from '@/lib/market/marketService';
import { normalizeTraderSymbolMetadata } from '@/lib/trader/marketMetadata';

export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = validateSymbol(searchParams.get('symbol'));

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

  const response = await fetchAssetProfile({
    symbol,
    providerSymbol: searchParams.get('providerSymbol') ?? undefined,
    assetType: searchParams.get('assetType') ?? searchParams.get('type') ?? 'stock',
    name: searchParams.get('name') ?? undefined,
    exchange: searchParams.get('exchange') ?? undefined,
    language: searchParams.get('lang') ?? undefined,
  });
  const metadata = normalizeTraderSymbolMetadata({
    symbol,
    displaySymbol: symbol,
    provider: response.source,
    providerSymbol: response.providerSymbol ?? searchParams.get('providerSymbol') ?? symbol,
    assetType: response.assetType ?? searchParams.get('assetType') ?? searchParams.get('type') ?? 'stock',
    quote: response.profile as Record<string, unknown> | null,
    catalog: {
      symbol,
      providerSymbol: searchParams.get('providerSymbol') ?? symbol,
      exchange: searchParams.get('exchange'),
      currency: searchParams.get('currency'),
      assetType: searchParams.get('assetType') ?? searchParams.get('type') ?? 'stock',
      name: searchParams.get('name') ?? undefined,
    },
  });
  const shariah = shariahClassificationFields(classifyShariahCompliance({
    symbol,
    name: response.profile?.name ?? searchParams.get('name') ?? symbol,
    assetType: response.assetType,
    exchange: response.profile?.exchange ?? searchParams.get('exchange'),
    country: response.profile?.country,
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
    companyProfile: profile,
    providerMessage: response.message,
    displaySymbol: metadata.displaySymbol ?? symbol,
    providerSymbol: metadata.providerSymbol ?? response.providerSymbol ?? searchParams.get('providerSymbol') ?? symbol,
    exchange: metadata.exchange,
    exchangeCode: metadata.exchangeCode,
    market: metadata.market,
    country: metadata.country,
    currency: metadata.currency,
    assetType: metadata.assetType ?? response.assetType,
    metadataDiagnostics: metadata.diagnostics,
    legacySuccess: response.success,
  });
}
