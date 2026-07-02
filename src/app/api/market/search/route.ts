import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { proxySearch } from '@/lib/market/marketDataProvider';
import { resolveMarketCurrency } from '@/lib/market/marketCurrency';
import { normalizeAssetType, type MarketAssetType, type MarketSearchItem } from '@/lib/market/marketService';
import {
  classifyShariahCompliance,
  normalizeShariahStatus,
  shariahClassificationFields,
  type ShariahScreeningData,
  type ShariahStatus,
} from '@/lib/market/shariah-screening';
import { marketExchangeAliases, normalizeMarketExchange } from '@/lib/market/marketExchangeOptions';
import { searchBundledMarketSymbols } from '@/lib/market/marketSymbolDirectory';
import { mergeMarketSearchResults, searchUSSymbols } from '@/lib/market/usSymbolResolver';
import { resolveMarketSymbol } from '@/lib/market/symbolResolver';
import { normalizeAssetSearchText } from '@/lib/market/assetAliases';
import { normalizeTraderSymbolMetadata } from '@/lib/trader/marketMetadata';

type MarketSymbolRow = {
  symbol: string;
  provider_symbol?: string | null;
  name?: string | null;
  asset_type: string;
  exchange: string | null;
  exchange_code?: string | null;
  market?: string | null;
  metadata?: Record<string, unknown> | null;
  display_symbol?: string | null;
  company_name_ar?: string | null;
  company_name_en?: string | null;
  country: string | null;
  currency: string | null;
  sector?: string | null;
  shariah_status?: string | null;
  shariah_reason?: string | null;
  shariah_source?: string | null;
  shariah_last_reviewed_at?: string | null;
  shariah_manual_override?: boolean | null;
  shariah_reviewed_by?: string | null;
  shariah_screening_data?: ShariahScreeningData | null;
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

function ensureShariahItem(item: MarketSearchItem): MarketSearchItem {
  if (item.shariahStatus) return item;
  const shariah = classifyShariahCompliance({
    symbol: item.symbol,
    name: item.name,
    assetType: item.assetType,
    exchange: item.exchange,
    country: item.country,
  });
  return {
    ...item,
    ...shariahClassificationFields(shariah),
  };
}

function normalizeSearchAssetType(value: unknown, fallback: MarketAssetType): MarketAssetType {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'fund') return 'etf';
  return raw ? normalizeAssetType(raw) : fallback;
}

function normalizeSearchItem(item: MarketSearchItem): MarketSearchItem {
  const metadata = normalizeTraderSymbolMetadata({
    symbol: item.symbol,
    displaySymbol: item.displaySymbol ?? item.symbol,
    providerSymbol: item.providerSymbol,
    assetType: item.assetType,
    catalog: item as Record<string, unknown>,
  });
  return {
    ...item,
    displaySymbol: metadata.displaySymbol ?? item.displaySymbol ?? item.symbol,
    providerSymbol: metadata.providerSymbol ?? item.providerSymbol,
    assetType: normalizeSearchAssetType(metadata.assetType, item.assetType),
    exchange: metadata.exchange ?? item.exchange,
    exchangeCode: metadata.exchangeCode ?? item.exchangeCode,
    market: metadata.market ?? item.market,
    country: metadata.country ?? item.country,
    currency: metadata.currency ?? item.currency,
    metadataDiagnostics: metadata.diagnostics,
  };
}

function filterAndRankResults(items: MarketSearchItem[], query: string, assetType?: MarketAssetType, shariahStatus?: ShariahStatus | null) {
  return items
    .map(normalizeSearchItem)
    .map(ensureShariahItem)
    .filter(item => !assetType || normalizeAssetType(item.assetType) === assetType)
    .filter(item => !shariahStatus || item.shariahStatus === shariahStatus)
    .map(item => ({ item, rank: searchRank(item, query) }))
    .filter(entry => !query || entry.rank > 0)
    .sort((a, b) => b.rank - a.rank || a.item.symbol.localeCompare(b.item.symbol))
    .map(entry => entry.item);
}

function mapMarketSymbol(row: MarketSymbolRow): MarketSearchItem {
  const symbol = String(row.display_symbol || row.symbol).toUpperCase();
  const providerSymbol = String(row.provider_symbol || symbol).toUpperCase();
  const assetType = normalizeAssetType(row.asset_type);
  const metadata = normalizeTraderSymbolMetadata({
    symbol,
    displaySymbol: row.display_symbol ?? symbol,
    providerSymbol,
    assetType,
    catalog: row as Record<string, unknown>,
  });
  const resolvedCurrency = resolveMarketCurrency({
    providerCurrency: metadata.currency ?? row.currency,
    symbol,
    providerSymbol,
    exchange: metadata.exchange ?? row.exchange,
    country: metadata.country ?? row.country,
    assetType,
  });
  const shariah = classifyShariahCompliance({
    symbol,
    name: row.company_name_en ?? row.company_name_ar ?? row.name ?? symbol,
    assetType,
    exchange: metadata.exchange ?? row.exchange,
    country: metadata.country ?? row.country,
    sector: row.sector,
    shariahStatus: row.shariah_status,
    shariahReason: row.shariah_reason,
    shariahSource: row.shariah_source,
    shariahLastReviewedAt: row.shariah_last_reviewed_at,
    shariahManualOverride: row.shariah_manual_override,
    shariahReviewedBy: row.shariah_reviewed_by,
    shariahScreeningData: row.shariah_screening_data,
  });
  return {
    symbol,
    providerSymbol,
    name: row.company_name_en ?? row.company_name_ar ?? row.name ?? symbol,
    displaySymbol: metadata.displaySymbol ?? symbol,
    assetType: normalizeSearchAssetType(metadata.assetType, assetType),
    exchange: metadata.exchange ?? row.exchange ?? row.market ?? undefined,
    exchangeCode: metadata.exchangeCode ?? row.exchange_code ?? undefined,
    market: metadata.market ?? row.market ?? undefined,
    country: metadata.country ?? row.country ?? undefined,
    currency: resolvedCurrency.currency ?? undefined,
    currencySource: resolvedCurrency.source,
    metadataDiagnostics: metadata.diagnostics,
    ...shariahClassificationFields(shariah),
  };
}

async function searchSupabaseSymbols(query: string, assetType?: MarketAssetType, exchange?: string | null, shariahStatus?: ShariahStatus | null) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const exchangeAliases = marketExchangeAliases(exchange);
  let request = supabase
    .from('market_symbols')
    .select('symbol, provider_symbol, name, asset_type, exchange, exchange_code, market, metadata, display_symbol, company_name_ar, company_name_en, sector, country, currency, shariah_status, shariah_reason, shariah_source, shariah_last_reviewed_at, shariah_manual_override, shariah_reviewed_by, shariah_screening_data')
    .eq('is_active', true)
    .limit(40);

  if (assetType) request = request.eq('asset_type', assetType);
  if (shariahStatus) request = request.eq('shariah_status', shariahStatus);
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
  const shariahStatus = normalizeShariahStatus(
    searchParams.get('shariahStatus') ?? searchParams.get('sharia_status') ?? searchParams.get('shariaStatus'),
    null,
  );
  const hasExchangeFilter = Boolean(exchange);
  const shouldSearchUSUniverse = (!hasExchangeFilter || exchange === 'US') && (!assetType || assetType === 'stock' || assetType === 'etf');
  const shouldUseResolver = !hasExchangeFilter;
  const resolved = query && shouldUseResolver ? await resolveMarketSymbol(query, assetType) : null;
  const resolverSuggestions = resolved
    ? resolved.ok
      ? [resolved.asset, ...resolved.suggestions]
      : resolved.suggestions
    : [];
  const resolvedItem = resolved?.ok ? normalizeSearchItem(resolved.asset) : null;

  const directoryResults = searchBundledMarketSymbols({
    query,
    assetType,
    exchange,
    shariahStatus,
    limit: hasExchangeFilter ? 40 : 16,
  });
  const supabaseResults = await searchSupabaseSymbols(query, assetType, exchange, shariahStatus);
  const usResults = shouldSearchUSUniverse ? await searchUSSymbols(query, assetType) : null;
  const primaryDirectoryResults = filterAndRankResults(directoryResults, query, assetType, shariahStatus);
  if (primaryDirectoryResults.length > 0 || (supabaseResults && supabaseResults.length > 0)) {
    const merged = filterAndRankResults(mergeMarketSearchResults(
      mergeMarketSearchResults(
        mergeMarketSearchResults(primaryDirectoryResults, supabaseResults ?? []),
        usResults?.results ?? [],
      ),
      resolverSuggestions,
    ), query, assetType, shariahStatus).slice(0, 20);
    return NextResponse.json({
      ok: true,
      success: true,
      query,
      exchange,
      shariahStatus,
      source: usResults ? `market_symbols+${usResults.source}` : 'market_symbols',
      results: merged,
      resolved: resolvedItem,
    });
  }

  if (usResults && usResults.results.length > 0) {
    const merged = filterAndRankResults(mergeMarketSearchResults(
      usResults.results,
      resolverSuggestions,
    ), query, assetType, shariahStatus).slice(0, 20);
    return NextResponse.json({
      ok: true,
      success: true,
      query,
      exchange,
      shariahStatus,
      source: usResults.source,
      fallback: false,
      results: merged,
      resolved: resolvedItem,
    });
  }

  const resolverResults = filterAndRankResults(mergeMarketSearchResults([], resolverSuggestions), query, assetType, shariahStatus).slice(0, 20);
  if (resolverResults.length > 0) {
    return NextResponse.json({
      ok: true,
      success: true,
      query,
      exchange,
      shariahStatus,
      source: resolved?.ok ? 'resolver' : 'resolver-suggestions',
      fallback: false,
      results: resolverResults,
      resolved: resolvedItem,
    });
  }

  const result = hasExchangeFilter ? null : await proxySearch(query, assetType);
  const liveResults = Array.isArray(result?.results) ? result.results as MarketSearchItem[] : [];
  const fallbackResults = filterAndRankResults(mergeMarketSearchResults(liveResults, []), query, assetType, shariahStatus).slice(0, 20);
  if (fallbackResults.length > 0) {
    return NextResponse.json({
      ok: true,
      success: true,
      query,
      exchange,
      shariahStatus,
      source: result?.source ?? 'resolver',
      fallback: result?.fallback,
      marketDataService: result?.marketDataService,
      results: fallbackResults,
      resolved: resolvedItem,
    });
  }

  return NextResponse.json({
    ok: true,
    ...(result ?? {}),
    exchange,
    shariahStatus,
    results: [],
    resolved: null,
  });
}
