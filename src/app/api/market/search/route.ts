import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { proxySearch } from '@/lib/market/openbbProxy';
import { normalizeAssetType, type MarketAssetType, type MarketSearchItem } from '@/lib/market/marketService';

type MarketSymbolRow = {
  symbol: string;
  provider_symbol: string;
  name: string;
  asset_type: string;
  exchange: string | null;
  country: string | null;
  currency: string | null;
};

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function cleanSearchTerm(value: string) {
  return value.trim().replace(/[%,]/g, '').slice(0, 64);
}

function mapMarketSymbol(row: MarketSymbolRow): MarketSearchItem & { currency?: string } {
  return {
    symbol: row.symbol.toUpperCase(),
    providerSymbol: row.provider_symbol.toUpperCase(),
    name: row.name,
    assetType: normalizeAssetType(row.asset_type),
    exchange: row.exchange ?? undefined,
    country: row.country ?? undefined,
    currency: row.currency ?? undefined,
  };
}

async function searchSupabaseSymbols(query: string, assetType?: MarketAssetType) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  let request = supabase
    .from('market_symbols')
    .select('symbol, provider_symbol, name, asset_type, exchange, country, currency')
    .eq('is_active', true)
    .limit(20);

  if (assetType) request = request.eq('asset_type', assetType);

  if (query) {
    const like = `%${query}%`;
    request = request.or(`symbol.ilike.${like},provider_symbol.ilike.${like},name.ilike.${like},exchange.ilike.${like}`);
  }

  const { data, error } = await request;
  if (error) return null;

  return (data ?? []).map(row => mapMarketSymbol(row as MarketSymbolRow));
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = cleanSearchTerm(searchParams.get('query') ?? searchParams.get('q') ?? '');
  const assetType = searchParams.get('assetType') ? normalizeAssetType(searchParams.get('assetType')) : undefined;

  const supabaseResults = await searchSupabaseSymbols(query, assetType);
  if (supabaseResults && supabaseResults.length > 0) {
    return NextResponse.json({
      success: true,
      query,
      source: 'supabase',
      results: supabaseResults,
    });
  }

  const result = await proxySearch(query, assetType);
  return NextResponse.json(result);
}
