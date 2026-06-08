import { NextRequest, NextResponse } from 'next/server';
import { normalizeAssetType } from '@/lib/market/marketService';
import { normalizeMarketExchange } from '@/lib/market/marketExchangeOptions';
import { bundledExchangeSymbolCount, listBundledMarketSymbols } from '@/lib/market/marketSymbolDirectory';

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
  const limit = cleanLimit(searchParams.get('limit'));

  const results = listBundledMarketSymbols({
    query,
    assetType,
    exchange,
    limit,
  });

  const items = results.map(item => ({
    exchange: item.exchangeId ?? normalizeMarketExchange(item.exchange) ?? item.exchange,
    market: item.marketLabel,
    symbol: item.symbol,
    display_symbol: item.displaySymbol,
    provider_symbol: item.providerSymbol,
    company_name_ar: item.companyNameAr ?? null,
    company_name_en: item.companyNameEn ?? item.name,
    asset_type: item.assetType,
    sector: null,
    currency: item.currency ?? null,
    country: item.country ?? null,
    price_unit: item.priceUnit ?? null,
    is_active: true,
    source: item.source ?? null,
    last_synced_at: item.lastSyncedAt ?? null,
  }));

  return NextResponse.json({
    ok: true,
    query,
    exchange,
    assetType,
    count: items.length,
    totalAvailable: exchange ? bundledExchangeSymbolCount(exchange) : undefined,
    items,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
