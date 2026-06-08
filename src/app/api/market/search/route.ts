import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { proxySearch } from '@/lib/market/openbbProxy';
import { resolveMarketCurrency } from '@/lib/market/marketCurrency';
import { normalizeAssetType, type MarketAssetType, type MarketSearchItem } from '@/lib/market/marketService';
import { marketExchangeAliases, normalizeMarketExchange } from '@/lib/market/marketExchangeOptions';
import { searchBundledMarketSymbols } from '@/lib/market/marketSymbolDirectory';
import { mergeMarketSearchResults, searchUSSymbols } from '@/lib/market/usSymbolResolver';
import { resolveMarketSymbol } from '@/lib/market/symbolResolver';
import { normalizeAssetSearchText } from '@/lib/market/assetAliases';

type MarketSymbolRow = {
  symbol: string;
  provider_symbol?: string | null;
  name?: string | null;
  asset_type: string;
  exchange: string | null;
  market?: string | null;
  display_symbol?: string | null;
  company_name_ar?: string | null;
  company_name_en?: string | null;
  country: string | null;
  currency: string | null;
};

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function cleanSearchTerm(value: string) {
  return value.trim().replace(/[%,]/g, '').slice(0, 64);
}

function compactSearchText(value: unknown) {
  return normalizeAssetSearchText(value).replace(/\s+/g, '');
}

function normalizeSymbolText(value: unknown) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[\\/]/g, '')
    .replace(/:/g, '');
}

function searchRank(item: MarketSearchItem, query: string) {
  const normalizedQuery = normalizeAssetSearchText(query);
  const compactQuery = compactSearchText(query);
  const symbolQuery = normalizeSymbolText(query);
  if (!normalizedQuery || !compactQuery) return 1;
  const hasSymbolQuery = Boolean(symbolQuery);

  const symbol = String(item.symbol ?? '').toUpperCase();
  const providerSymbol = String(item.providerSymbol ?? '').toUpperCase();
  const compactSymbol = normalizeSymbolText(item.symbol);
  const compactProviderSymbol = normalizeSymbolText(item.providerSymbol);
  const name = normalizeAssetSearchText(item.name);
  const compactName = compactSearchText(item.name);
  const aliases = (item.aliases ?? []).map(alias => normalizeAssetSearchText(alias)).filter(Boolean);
  const compactAliases = (item.aliases ?? []).map(alias => compactSearchText(alias)).filter(Boolean);
  const exactAliasMatch = aliases.some(alias => alias === normalizedQuery) || compactAliases.some(alias => alias === compactQuery);

  if (item.assetType === 'crypto' && exactAliasMatch) return 110;
  if (hasSymbolQuery && (symbol === symbolQuery || providerSymbol === symbolQuery || compactSymbol === symbolQuery || compactProviderSymbol === symbolQuery)) return 100;
  if (exactAliasMatch) return 95;
  if (hasSymbolQuery && (symbol.startsWith(symbolQuery) || providerSymbol.startsWith(symbolQuery) || compactSymbol.startsWith(symbolQuery) || compactProviderSymbol.startsWith(symbolQuery))) return 90;
  if (name === normalizedQuery || compactName === compactQuery || name.startsWith(normalizedQuery) || compactName.startsWith(compactQuery)) return 80;
  if (name.includes(normalizedQuery) || compactName.includes(compactQuery)) return 70;
  if (aliases.some(alias => alias.startsWith(normalizedQuery)) || compactAliases.some(alias => alias.startsWith(compactQuery))) return 50;
  if (aliases.some(alias => alias.includes(normalizedQuery)) || compactAliases.some(alias => alias.includes(compactQuery))) return 40;
  return 0;
}

function filterAndRankResults(items: MarketSearchItem[], query: string, assetType?: MarketAssetType) {
  return items
    .filter(item => !assetType || normalizeAssetType(item.assetType) === assetType)
    .map(item => ({ item, rank: searchRank(item, query) }))
    .filter(entry => !query || entry.rank > 0)
    .sort((a, b) => b.rank - a.rank || a.item.symbol.localeCompare(b.item.symbol))
    .map(entry => entry.item);
}

function mapMarketSymbol(row: MarketSymbolRow): MarketSearchItem {
  const symbol = String(row.display_symbol || row.symbol).toUpperCase();
  const providerSymbol = String(row.provider_symbol || symbol).toUpperCase();
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
    name: row.company_name_en ?? row.company_name_ar ?? row.name ?? symbol,
    assetType,
    exchange: row.market ?? row.exchange ?? undefined,
    country: row.country ?? undefined,
    currency: resolvedCurrency.currency ?? undefined,
    currencySource: resolvedCurrency.source,
  };
}

async function searchSupabaseSymbols(query: string, assetType?: MarketAssetType, exchange?: string | null) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const exchangeAliases = marketExchangeAliases(exchange);
  let request = supabase
    .from('market_symbols')
    .select('symbol, provider_symbol, name, asset_type, exchange, market, display_symbol, company_name_ar, company_name_en, country, currency')
    .eq('is_active', true)
    .limit(40);

  if (assetType) request = request.eq('asset_type', assetType);
  if (exchangeAliases.length > 0) request = request.in('exchange', exchangeAliases);

  if (query) {
    const like = `%${query}%`;
    request = request.or(`symbol.ilike.${like},display_symbol.ilike.${like},provider_symbol.ilike.${like},name.ilike.${like},company_name_ar.ilike.${like},company_name_en.ilike.${like},exchange.ilike.${like},market.ilike.${like}`);
  }

  const { data, error } = await request;
  if (!error) return (data ?? []).map(row => mapMarketSymbol(row as MarketSymbolRow));

  let legacyRequest = supabase
    .from('market_symbols')
    .select('symbol, provider_symbol, name, asset_type, exchange, country, currency')
    .eq('is_active', true)
    .limit(40);

  if (assetType) legacyRequest = legacyRequest.eq('asset_type', assetType);
  if (exchangeAliases.length > 0) legacyRequest = legacyRequest.in('exchange', exchangeAliases);
  if (query) {
    const like = `%${query}%`;
    legacyRequest = legacyRequest.or(`symbol.ilike.${like},provider_symbol.ilike.${like},name.ilike.${like},exchange.ilike.${like}`);
  }

  const legacy = await legacyRequest;
  if (legacy.error) return null;

  return (legacy.data ?? []).map(row => mapMarketSymbol(row as MarketSymbolRow));
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = cleanSearchTerm(searchParams.get('query') ?? searchParams.get('q') ?? '');
  const assetTypeParam = searchParams.get('assetType');
  const assetType = assetTypeParam && assetTypeParam !== 'all' ? normalizeAssetType(assetTypeParam) : undefined;
  const exchange = normalizeMarketExchange(searchParams.get('exchange') ?? searchParams.get('market'));
  const hasExchangeFilter = Boolean(exchange);
  const shouldSearchUSUniverse = (!hasExchangeFilter || exchange === 'US') && (!assetType || assetType === 'stock' || assetType === 'etf');
  const shouldUseResolver = !hasExchangeFilter;
  const resolved = query && shouldUseResolver ? await resolveMarketSymbol(query, assetType) : null;
  const resolverSuggestions = resolved
    ? resolved.ok
      ? [resolved.asset, ...resolved.suggestions]
      : resolved.suggestions
    : [];

  const directoryResults = searchBundledMarketSymbols({
    query,
    assetType,
    exchange,
    limit: hasExchangeFilter ? 40 : 16,
  });
  const supabaseResults = await searchSupabaseSymbols(query, assetType, exchange);
  const usResults = shouldSearchUSUniverse ? await searchUSSymbols(query, assetType) : null;
  const primaryDirectoryResults = filterAndRankResults(directoryResults, query, assetType);
  if (primaryDirectoryResults.length > 0 || (supabaseResults && supabaseResults.length > 0)) {
    const merged = filterAndRankResults(mergeMarketSearchResults(
      mergeMarketSearchResults(
        mergeMarketSearchResults(primaryDirectoryResults, supabaseResults ?? []),
        usResults?.results ?? [],
      ),
      resolverSuggestions,
    ), query, assetType).slice(0, 20);
    return NextResponse.json({
      ok: true,
      success: true,
      query,
      exchange,
      source: usResults ? `market_symbols+${usResults.source}` : 'market_symbols',
      results: merged,
      resolved: resolved?.ok ? resolved.asset : null,
    });
  }

  if (usResults && usResults.results.length > 0) {
    const merged = filterAndRankResults(mergeMarketSearchResults(
      usResults.results,
      resolverSuggestions,
    ), query, assetType).slice(0, 20);
    return NextResponse.json({
      ok: true,
      success: true,
      query,
      exchange,
      source: usResults.source,
      fallback: false,
      results: merged,
      resolved: resolved?.ok ? resolved.asset : null,
    });
  }

  const resolverResults = filterAndRankResults(mergeMarketSearchResults([], resolverSuggestions), query, assetType).slice(0, 20);
  if (resolverResults.length > 0) {
    return NextResponse.json({
      ok: true,
      success: true,
      query,
      exchange,
      source: resolved?.ok ? 'resolver' : 'resolver-suggestions',
      fallback: false,
      results: resolverResults,
      resolved: resolved?.ok ? resolved.asset : null,
    });
  }

  const result = hasExchangeFilter ? null : await proxySearch(query, assetType);
  const liveResults = Array.isArray(result?.results) ? result.results as MarketSearchItem[] : [];
  const fallbackResults = filterAndRankResults(mergeMarketSearchResults(liveResults, []), query, assetType).slice(0, 20);
  if (fallbackResults.length > 0) {
    return NextResponse.json({
      ok: true,
      success: true,
      query,
      exchange,
      source: result?.source ?? 'resolver',
      fallback: result?.fallback,
      openbbService: result?.openbbService,
      results: fallbackResults,
      resolved: resolved?.ok ? resolved.asset : null,
    });
  }

  return NextResponse.json({
    ok: true,
    ...(result ?? {}),
    exchange,
    results: [],
    resolved: null,
  });
}
