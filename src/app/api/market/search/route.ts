import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { proxySearch } from '@/lib/market/openbbProxy';
import { resolveMarketCurrency } from '@/lib/market/marketCurrency';
import { normalizeAssetType, type MarketAssetType, type MarketSearchItem } from '@/lib/market/marketService';
import { mergeMarketSearchResults, searchUSSymbols } from '@/lib/market/usSymbolResolver';
import { resolveMarketSymbol } from '@/lib/market/symbolResolver';

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

function mapMarketSymbol(row: MarketSymbolRow): MarketSearchItem {
  const symbol = row.symbol.toUpperCase();
  const providerSymbol = row.provider_symbol.toUpperCase();
  const assetType = normalizeAssetType(row.asset_type);
  const resolvedCurrency = resolveMarketCurrency({
    providerCurrency: row.currency,
    symbol,
    providerSymbol,
    exchange: row.exchange,
    country: row.country,
    assetType,
  });
  return {
    symbol,
    providerSymbol,
    name: row.name,
    assetType,
    exchange: row.exchange ?? undefined,
    country: row.country ?? undefined,
    currency: resolvedCurrency.currency ?? undefined,
    currencySource: resolvedCurrency.source,
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
  const shouldSearchUSUniverse = !assetType || assetType === 'stock' || assetType === 'etf';
  const resolved = query ? await resolveMarketSymbol(query, assetType) : null;
  const resolverSuggestions = resolved
    ? resolved.ok
      ? [resolved.asset, ...resolved.suggestions]
      : resolved.suggestions
    : [];

  const supabaseResults = await searchSupabaseSymbols(query, assetType);
  const usResults = shouldSearchUSUniverse ? await searchUSSymbols(query, assetType) : null;
  if (supabaseResults && supabaseResults.length > 0) {
    const merged = mergeMarketSearchResults(
      mergeMarketSearchResults(supabaseResults, usResults?.results ?? []),
      resolverSuggestions,
    ).slice(0, 20);
    return NextResponse.json({
      ok: true,
      success: true,
      query,
      source: usResults ? `supabase+${usResults.source}` : 'supabase',
      results: merged,
      resolved: resolved?.ok ? resolved.asset : null,
    });
  }

  if (usResults && usResults.results.length > 0) {
    return NextResponse.json({
      ok: true,
      success: true,
      query,
      source: usResults.source,
      fallback: false,
      results: mergeMarketSearchResults(
        usResults.results,
        resolverSuggestions,
      ).slice(0, 20),
      resolved: resolved?.ok ? resolved.asset : null,
    });
  }

  const resolverResults = mergeMarketSearchResults([], resolverSuggestions).slice(0, 20);
  if (resolverResults.length > 0) {
    return NextResponse.json({
      ok: true,
      success: true,
      query,
      source: resolved?.ok ? 'resolver' : 'resolver-suggestions',
      fallback: false,
      results: resolverResults,
      resolved: resolved?.ok ? resolved.asset : null,
    });
  }

  const result = await proxySearch(query, assetType);
  const liveResults = Array.isArray(result?.results) ? result.results as MarketSearchItem[] : [];
  const fallbackResults = mergeMarketSearchResults(liveResults, []).slice(0, 20);
  if (fallbackResults.length > 0) {
    return NextResponse.json({
      ok: true,
      success: true,
      query,
      source: result?.source ?? 'resolver',
      fallback: result?.fallback,
      openbbService: result?.openbbService,
      results: fallbackResults,
      resolved: resolved?.ok ? resolved.asset : null,
    });
  }

  return NextResponse.json({
    ok: true,
    ...result,
    results: [],
    resolved: null,
  });
}
