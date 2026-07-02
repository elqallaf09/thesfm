import { NextRequest, NextResponse } from 'next/server';
import { createMarketFeatureDiagnostic } from '@/lib/market/featureDiagnostics';
import { normalizeAssetType } from '@/lib/market/marketService';
import { normalizeShariahStatus } from '@/lib/market/shariah-screening';
import { normalizeMarketExchange } from '@/lib/market/marketExchangeOptions';
import { bundledExchangeSymbolCount, listBundledMarketSymbols } from '@/lib/market/marketSymbolDirectory';
import { normalizeTraderSymbolMetadata } from '@/lib/trader/marketMetadata';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function cleanSearchTerm(value: string) {
  return value.trim().replace(/[%,]/g, '').replace(/\s+/g, ' ').slice(0, 80);
}

function cleanLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 100;
  return Math.min(Math.max(Math.trunc(parsed), 1), 250);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = cleanSearchTerm(searchParams.get('q') ?? searchParams.get('query') ?? '');
  const exchange = normalizeMarketExchange(searchParams.get('exchange') ?? searchParams.get('market'));
  const assetTypeParam = searchParams.get('assetType');
  const assetType = assetTypeParam && assetTypeParam !== 'all' ? normalizeAssetType(assetTypeParam) : undefined;
  const shariahStatus = normalizeShariahStatus(
    searchParams.get('shariahStatus') ?? searchParams.get('sharia_status') ?? searchParams.get('shariaStatus'),
    null,
  );
  const limit = cleanLimit(searchParams.get('limit'));

  const results = listBundledMarketSymbols({
    query,
    assetType,
    exchange,
    shariahStatus,
    limit,
  });

  const items = results.map(item => {
    const metadata = normalizeTraderSymbolMetadata({
      symbol: item.symbol,
      displaySymbol: item.displaySymbol ?? item.symbol,
      providerSymbol: item.providerSymbol,
      assetType: item.assetType,
      catalog: {
        ...item,
        exchange: item.exchange,
        market: item.marketLabel,
        currency: item.currency,
        country: item.country,
      } as Record<string, unknown>,
    });
    return {
      exchange: metadata.exchange ?? item.exchangeId ?? normalizeMarketExchange(item.exchange) ?? item.exchange,
      exchange_code: metadata.exchangeCode,
      market: metadata.market ?? item.marketLabel,
      symbol: item.symbol,
      display_symbol: metadata.displaySymbol ?? item.displaySymbol,
      provider_symbol: metadata.providerSymbol ?? item.providerSymbol,
      company_name_ar: item.companyNameAr ?? null,
      company_name_en: item.companyNameEn ?? item.name,
      asset_type: metadata.assetType ?? item.assetType,
      sector: null,
      currency: metadata.currency ?? item.currency ?? null,
      country: metadata.country ?? item.country ?? null,
      price_unit: item.priceUnit ?? null,
      is_active: true,
      source: item.source ?? null,
      last_synced_at: item.lastSyncedAt ?? null,
      metadataDiagnostics: metadata.diagnostics,
      shariah_status: item.shariahStatus,
      shariah_reason: item.shariahReason,
      shariah_source: item.shariahSource,
      shariah_last_reviewed_at: item.shariahLastReviewedAt,
      shariah_manual_override: item.shariahManualOverride,
      shariah_reviewed_by: item.shariahReviewedBy,
      shariah_screening_data: item.shariahScreeningData,
    };
  });
  const diagnostic = createMarketFeatureDiagnostic({
    feature: 'symbols',
    provider: 'Local market directory',
    providerStatus: 'available',
    data: items,
  });

  return NextResponse.json({
    ...diagnostic,
    query,
    exchange,
    assetType,
    shariahStatus,
    totalAvailable: exchange ? bundledExchangeSymbolCount(exchange) : undefined,
    items,
    legacyOk: true,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
