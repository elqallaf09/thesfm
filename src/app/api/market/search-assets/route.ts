import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { findAssetAliasMatches, normalizeAssetSearchText } from '@/lib/market/assetAliases';
import { fetchYahooNormalizedQuote, type YahooNormalizedQuote } from '@/lib/market/fetchYahooQuote';
import { normalizeMarketPrice, resolveMarketCurrency } from '@/lib/market/marketCurrency';
import { normalizeAssetType, normalizeMarketSymbolInput, type MarketAssetType, type MarketSearchItem } from '@/lib/market/marketService';
import {
  exchangeRequiresSymbolSync,
  marketExchangeAliases,
  marketExchangeLabel,
  normalizeMarketExchange,
} from '@/lib/market/marketExchangeOptions';
import {
  searchBundledMarketSymbols,
  type MarketSymbolSearchResult,
} from '@/lib/market/marketSymbolDirectory';
import { proxySearch } from '@/lib/market/marketDataProvider';
import { mergeMarketSearchResults, searchUSSymbols } from '@/lib/market/usSymbolResolver';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  sector?: string | null;
  country: string | null;
  currency: string | null;
  price_unit?: 'major' | 'fils' | 'pence' | null;
  source?: string | null;
  last_synced_at?: string | null;
};

type AssetCandidate = {
  symbol: string;
  providerSymbol?: string;
  providerSymbols?: string[];
  name: string;
  nameAr?: string;
  nameEn?: string;
  assetType: MarketAssetType;
  market?: string;
  marketAr?: string;
  marketEn?: string;
  country?: string;
  currency?: string;
  priceUnit?: 'major' | 'fils' | 'pence' | null;
  source?: string | null;
  lastSyncedAt?: string | null;
  sourceHint: string;
};

type AssetSearchItem = {
  name: string;
  name_ar?: string;
  name_en?: string;
  symbol: string;
  provider_symbol: string | null;
  market: string | null;
  market_ar?: string;
  market_en?: string;
  country?: string;
  asset_type: MarketAssetType;
  currency: string | null;
  price_unit?: 'major' | 'fils' | 'pence' | null;
  price: number | null;
  change: number | null;
  change_percent: number | null;
  updated_at: string | null;
  source: string;
  search_source: string;
  available: boolean;
  unavailable_reason?: string;
};

const MAX_RESULTS = 32;
const PRICE_ENRICH_LIMIT = 10;

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function cleanSearchTerm(value: string) {
  return value.trim().replace(/[%,]/g, '').replace(/\s+/g, ' ').slice(0, 80);
}

function searchTermVariants(value: string) {
  const normalized = normalizeAssetSearchText(value);
  const withoutTaMarbuta = normalized.replace(/Ø©/g, 'Ù‡');
  const withTaMarbuta = normalized.replace(/Ù‡/g, 'Ø©');
  return Array.from(new Set([
    value.trim(),
    normalized,
    withoutTaMarbuta,
    withTaMarbuta,
  ].map(item => item.trim()).filter(Boolean)));
}

function supabaseLikeFilters(query: string, fields: string[]) {
  const variants = searchTermVariants(query).map(value => value.replace(/[(),]/g, ' '));
  return variants
    .flatMap(value => fields.map(field => `${field}.ilike.%${value}%`))
    .join(',');
}

function mapMarketSymbol(row: MarketSymbolRow): AssetCandidate {
  const exchangeId = normalizeMarketExchange(row.exchange);
  const symbol = String(row.display_symbol || row.symbol).trim().toUpperCase();
  const providerSymbol = String(row.provider_symbol || symbol).trim().toUpperCase();
  const nameEn = String(row.company_name_en || row.name || symbol).trim();
  const nameAr = row.company_name_ar ? String(row.company_name_ar).trim() : undefined;
  const marketEn = exchangeId ? marketExchangeLabel(exchangeId, 'en') : row.market ?? row.exchange ?? undefined;
  const marketAr = exchangeId ? marketExchangeLabel(exchangeId, 'ar') : row.market ?? row.exchange ?? undefined;
  return {
    symbol,
    providerSymbol,
    providerSymbols: [providerSymbol, symbol],
    name: nameAr ?? nameEn,
    nameAr,
    nameEn,
    assetType: normalizeAssetType(row.asset_type),
    market: marketAr ?? marketEn,
    marketAr,
    marketEn,
    country: row.country ?? undefined,
    currency: row.currency ?? undefined,
    priceUnit: row.price_unit ?? undefined,
    source: row.source ?? undefined,
    lastSyncedAt: row.last_synced_at ?? undefined,
    sourceHint: row.source ?? 'supabase',
  };
}

async function searchSupabaseSymbols(query: string, assetType?: MarketAssetType, exchange?: string | null) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  try {
    const exchangeAliases = marketExchangeAliases(exchange);
    let request = supabase
      .from('market_symbols')
      .select('symbol, provider_symbol, name, asset_type, exchange, market, display_symbol, company_name_ar, company_name_en, sector, country, currency, price_unit, source, last_synced_at')
      .eq('is_active', true)
      .limit(48);

    if (assetType) request = request.eq('asset_type', assetType);
    if (exchangeAliases.length > 0) request = request.in('exchange', exchangeAliases);

    if (query) {
      request = request.or(supabaseLikeFilters(query, [
        'symbol',
        'display_symbol',
        'provider_symbol',
        'name',
        'company_name_ar',
        'company_name_en',
        'exchange',
        'market',
      ]));
    }

    const { data, error } = await request;
    if (!error) return (data ?? []).map(row => mapMarketSymbol(row as MarketSymbolRow));

    let legacyRequest = supabase
      .from('market_symbols')
      .select('symbol, provider_symbol, name, asset_type, exchange, country, currency')
      .eq('is_active', true)
      .limit(48);

    if (assetType) legacyRequest = legacyRequest.eq('asset_type', assetType);
    if (exchangeAliases.length > 0) legacyRequest = legacyRequest.in('exchange', exchangeAliases);
    if (query) {
      legacyRequest = legacyRequest.or(supabaseLikeFilters(query, [
        'symbol',
        'provider_symbol',
        'name',
        'exchange',
      ]));
    }

    const legacy = await legacyRequest;
    if (legacy.error) return [];
    return (legacy.data ?? []).map(row => mapMarketSymbol(row as MarketSymbolRow));
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[MarketSearchAssets] Supabase symbol search skipped', {
        query,
        exchange,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return [];
  }
}

function candidateFromSearchItem(item: MarketSearchItem, sourceHint: string): AssetCandidate {
  const symbol = item.symbol.toUpperCase();
  const providerSymbol = item.providerSymbol?.toUpperCase();
  return {
    symbol,
    providerSymbol,
    providerSymbols: [providerSymbol, symbol].filter(Boolean) as string[],
    name: item.name,
    nameEn: item.name,
    assetType: normalizeAssetType(item.assetType),
    market: item.exchange,
    country: item.country,
    currency: item.currency,
    sourceHint,
  };
}

function candidateFromDirectory(item: MarketSymbolSearchResult): AssetCandidate {
  const symbol = item.symbol.toUpperCase();
  const providerSymbol = item.providerSymbol?.toUpperCase();
  return {
    symbol,
    providerSymbol,
    providerSymbols: [providerSymbol, symbol].filter(Boolean) as string[],
    name: item.companyNameAr ?? item.companyNameEn ?? item.name,
    nameAr: item.companyNameAr,
    nameEn: item.companyNameEn ?? item.name,
    assetType: normalizeAssetType(item.assetType),
    market: item.exchangeLabelAr ?? item.exchange,
    marketAr: item.exchangeLabelAr,
    marketEn: item.exchangeLabelEn ?? item.exchange,
    country: item.country,
    currency: item.currency,
    priceUnit: item.priceUnit,
    source: item.exchangeLabelEn ?? item.exchange ?? 'Market symbol directory',
    lastSyncedAt: item.lastSyncedAt,
    sourceHint: item.source ?? 'market_symbol_directory',
  };
}

function candidateFromAlias(alias: ReturnType<typeof findAssetAliasMatches>[number]): AssetCandidate {
  return {
    symbol: alias.symbol,
    providerSymbol: alias.symbolCandidates[0],
    providerSymbols: alias.symbolCandidates,
    name: alias.nameAr,
    nameAr: alias.nameAr,
    nameEn: alias.nameEn,
    assetType: alias.assetType,
    market: alias.marketEn,
    marketAr: alias.marketAr,
    marketEn: alias.marketEn,
    currency: alias.currency,
    sourceHint: 'alias',
  };
}

function dedupeCandidates(candidates: AssetCandidate[]) {
  const byKey = new Map<string, AssetCandidate>();
  for (const candidate of candidates) {
    const normalized = {
      ...candidate,
      symbol: candidate.symbol.toUpperCase(),
      providerSymbol: candidate.providerSymbol?.toUpperCase(),
      providerSymbols: candidate.providerSymbols?.map(symbol => symbol.toUpperCase()),
    };
    const key = normalized.assetType === 'crypto'
      ? `${normalized.symbol}:${normalized.providerSymbol ?? ''}:${normalized.name}:${normalized.assetType}`
      : `${normalized.symbol}:${normalized.assetType}`;
    if (!byKey.has(key)) byKey.set(key, normalized);
  }
  return Array.from(byKey.values());
}

function quoteSymbols(candidate: AssetCandidate) {
  return Array.from(new Set([
    ...(candidate.providerSymbols ?? []),
    candidate.providerSymbol,
    candidate.symbol,
  ].filter(Boolean).map(symbol => String(symbol).toUpperCase())));
}

function normalizeQuoteUnits(quote: YahooNormalizedQuote, candidate: AssetCandidate) {
  const providerSymbols = quoteSymbols(candidate);
  const providerSymbol = quote.symbolUsed ?? candidate.providerSymbol ?? providerSymbols[0] ?? candidate.symbol;
  const resolvedCurrency = resolveMarketCurrency({
    providerCurrency: quote.currency ?? candidate.currency,
    symbol: candidate.symbol,
    providerSymbol,
    exchange: candidate.market,
    market: candidate.market,
    country: candidate.country,
    assetType: candidate.assetType,
  });
  const normalizedPrice = normalizeMarketPrice({
    price: quote.price,
    currency: resolvedCurrency.currency,
    providerCurrency: quote.currency,
    symbol: candidate.symbol,
    providerSymbol,
    exchange: candidate.market,
    market: candidate.market,
    assetType: candidate.assetType,
    priceUnit: candidate.priceUnit,
  });
  const normalizedChange = normalizeMarketPrice({
    price: quote.change,
    currency: resolvedCurrency.currency,
    providerCurrency: quote.currency,
    symbol: candidate.symbol,
    providerSymbol,
    exchange: candidate.market,
    market: candidate.market,
    assetType: candidate.assetType,
    priceUnit: normalizedPrice.priceUnit,
  });

  return {
    price: normalizedPrice.price,
    change: normalizedChange.price,
    currency: resolvedCurrency.currency,
    priceUnit: normalizedPrice.priceUnit,
  };
}

function normalizeResult(candidate: AssetCandidate, quote: YahooNormalizedQuote): AssetSearchItem {
  const normalizedQuote = normalizeQuoteUnits(quote, candidate);
  return {
    name: candidate.nameAr ?? candidate.name,
    name_ar: candidate.nameAr,
    name_en: candidate.nameEn ?? candidate.name,
    symbol: candidate.symbol,
    provider_symbol: quote.symbolUsed ?? candidate.providerSymbol ?? quoteSymbols(candidate)[0] ?? null,
    market: candidate.marketAr ?? candidate.market ?? null,
    market_ar: candidate.marketAr,
    market_en: candidate.marketEn ?? candidate.market,
    country: candidate.country,
    asset_type: candidate.assetType,
    currency: normalizedQuote.currency,
    price_unit: normalizedQuote.priceUnit,
    price: normalizedQuote.price,
    change: normalizedQuote.change,
    change_percent: quote.changePercent,
    updated_at: quote.marketTime,
    source: quote.source,
    search_source: candidate.sourceHint,
    available: quote.available,
    unavailable_reason: quote.unavailableReason,
  };
}

function unavailableResult(candidate: AssetCandidate, unavailableReason = 'price_unavailable'): AssetSearchItem {
  const providerSymbols = quoteSymbols(candidate);
  const providerSymbol = candidate.providerSymbol ?? providerSymbols[0] ?? candidate.symbol;
  const resolvedCurrency = resolveMarketCurrency({
    providerCurrency: candidate.currency,
    symbol: candidate.symbol,
    providerSymbol,
    exchange: candidate.market,
    market: candidate.market,
    country: candidate.country,
    assetType: candidate.assetType,
  });

  return {
    name: candidate.nameAr ?? candidate.name,
    name_ar: candidate.nameAr,
    name_en: candidate.nameEn ?? candidate.name,
    symbol: candidate.symbol,
    provider_symbol: providerSymbol,
    market: candidate.marketAr ?? candidate.market ?? null,
    market_ar: candidate.marketAr,
    market_en: candidate.marketEn ?? candidate.market,
    country: candidate.country,
    asset_type: candidate.assetType,
    currency: candidate.currency ?? resolvedCurrency.currency,
    price_unit: candidate.priceUnit ?? null,
    price: null,
    change: null,
    change_percent: null,
    updated_at: candidate.lastSyncedAt ?? null,
    source: candidate.source ?? candidate.sourceHint,
    search_source: candidate.sourceHint,
    available: false,
    unavailable_reason: unavailableReason,
  };
}

async function enrichCandidate(candidate: AssetCandidate): Promise<AssetSearchItem> {
  const quote = await fetchYahooNormalizedQuote({
    requestedSymbol: candidate.symbol,
    symbols: quoteSymbols(candidate),
    name: candidate.nameEn ?? candidate.name,
    debugContext: {
      route: '/api/market/search-assets',
      searchSource: candidate.sourceHint,
      assetType: candidate.assetType,
    },
  });

  return normalizeResult(candidate, quote);
}

async function directQuoteCandidate(query: string, assetType?: MarketAssetType): Promise<AssetCandidate | null> {
  const normalized = normalizeMarketSymbolInput(query, assetType);
  if (!normalized.valid) return null;
  const valid = normalized as {
    symbol: string;
    displaySymbol?: string;
    providerSymbol: string;
    assetType: MarketAssetType;
  };

  return {
    symbol: valid.displaySymbol ?? valid.symbol,
    providerSymbol: valid.providerSymbol,
    providerSymbols: [valid.providerSymbol, valid.symbol],
    name: valid.displaySymbol ?? valid.symbol,
    assetType: valid.assetType,
    currency: undefined,
    sourceHint: 'direct_quote',
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = cleanSearchTerm(searchParams.get('q') ?? searchParams.get('query') ?? '');
  const assetType = searchParams.get('assetType') ? normalizeAssetType(searchParams.get('assetType')) : undefined;
  const exchange = normalizeMarketExchange(searchParams.get('exchange') ?? searchParams.get('market'));

  if (query.length < 2) {
    return NextResponse.json({ ok: true, query, items: [], message: 'NO_RESULTS' });
  }

  try {
    const hasExchangeFilter = Boolean(exchange);
    const shouldSearchUSUniverse = (!hasExchangeFilter || exchange === 'US') && (!assetType || assetType === 'stock' || assetType === 'etf');
    const shouldSearchExternal = !hasExchangeFilter;
    const directoryCandidates = searchBundledMarketSymbols({
      query,
      assetType,
      exchange,
      limit: hasExchangeFilter ? 48 : 16,
    }).map(candidateFromDirectory);
    const aliasCandidates = (!hasExchangeFilter || exchange === 'BOURSA_KUWAIT')
      ? findAssetAliasMatches(query).map(candidateFromAlias)
      : [];
    const [supabaseCandidates, usResults, proxyResult, directCandidate] = await Promise.all([
      searchSupabaseSymbols(query, assetType, exchange),
      shouldSearchUSUniverse ? searchUSSymbols(query, assetType) : Promise.resolve(null),
      shouldSearchExternal ? proxySearch(query, assetType) : Promise.resolve(null),
      shouldSearchExternal ? directQuoteCandidate(query, assetType) : Promise.resolve(null),
    ]);

    const proxyItems = Array.isArray(proxyResult?.results)
      ? proxyResult.results as MarketSearchItem[]
      : [];
    const mergedSearchItems = mergeMarketSearchResults(
      proxyItems,
      usResults?.results ?? [],
    ).slice(0, 16);

    const candidates = dedupeCandidates([
      ...directoryCandidates,
      ...aliasCandidates,
      ...supabaseCandidates,
      ...mergedSearchItems.map(item => candidateFromSearchItem(item, usResults ? `market_search+${usResults.source}` : 'market_search')),
      ...(directCandidate ? [directCandidate] : []),
    ]).slice(0, MAX_RESULTS);

    const candidatesToEnrich = candidates.slice(0, PRICE_ENRICH_LIMIT);
    const enriched = await Promise.allSettled(candidatesToEnrich.map(enrichCandidate));
    const enrichedItems = enriched
      .map((result, index) => {
        const candidate = candidatesToEnrich[index];
        if (result.status === 'fulfilled') return result.value;
        return unavailableResult(candidate, 'price_provider_unavailable');
      })
      .filter(item => item.search_source !== 'direct_quote' || item.available);
    const enrichedKeys = new Set(enrichedItems.map(item => `${item.symbol}:${item.asset_type}`));
    const fallbackItems = candidates
      .slice(PRICE_ENRICH_LIMIT)
      .filter(candidate => !enrichedKeys.has(`${candidate.symbol}:${candidate.assetType}`))
      .map(candidate => unavailableResult(candidate));
    const items = [...enrichedItems, ...fallbackItems]
      .filter((item, index, list) => list.findIndex(entry => `${entry.symbol}:${entry.asset_type}` === `${item.symbol}:${item.asset_type}`) === index)
      .slice(0, MAX_RESULTS);
    const needsSync = items.length === 0 && exchangeRequiresSymbolSync(exchange);

    return NextResponse.json({
      ok: true,
      query,
      exchange,
      items,
      message: items.length > 0 ? undefined : needsSync ? 'SYMBOLS_SYNCING' : 'NO_RESULTS',
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[MarketSearchAssets] provider unavailable', {
        query,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return NextResponse.json({
      ok: false,
      code: 'MARKET_SEARCH_PROVIDER_UNAVAILABLE',
      items: [],
    }, { status: 503 });
  }
}
