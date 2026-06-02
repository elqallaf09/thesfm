import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { findAssetAliasMatches } from '@/lib/market/assetAliases';
import { fetchYahooNormalizedQuote, type YahooNormalizedQuote } from '@/lib/market/fetchYahooQuote';
import { normalizeAssetType, normalizeMarketSymbolInput, type MarketAssetType, type MarketSearchItem } from '@/lib/market/marketService';
import { proxySearch } from '@/lib/market/openbbProxy';
import { mergeMarketSearchResults, searchUSSymbols } from '@/lib/market/usSymbolResolver';

export const revalidate = 300;

type MarketSymbolRow = {
  symbol: string;
  provider_symbol: string;
  name: string;
  asset_type: string;
  exchange: string | null;
  country: string | null;
  currency: string | null;
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
  price: number | null;
  change: number | null;
  change_percent: number | null;
  updated_at: string | null;
  source: string;
  search_source: string;
  available: boolean;
  unavailable_reason?: string;
};

const MAX_RESULTS = 8;

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function cleanSearchTerm(value: string) {
  return value.trim().replace(/[%,]/g, '').replace(/\s+/g, ' ').slice(0, 80);
}

function mapMarketSymbol(row: MarketSymbolRow): AssetCandidate {
  return {
    symbol: row.symbol.toUpperCase(),
    providerSymbol: row.provider_symbol.toUpperCase(),
    providerSymbols: [row.provider_symbol.toUpperCase(), row.symbol.toUpperCase()],
    name: row.name,
    nameEn: row.name,
    assetType: normalizeAssetType(row.asset_type),
    market: row.exchange ?? undefined,
    country: row.country ?? undefined,
    currency: row.currency ?? undefined,
    sourceHint: 'supabase',
  };
}

async function searchSupabaseSymbols(query: string, assetType?: MarketAssetType) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  let request = supabase
    .from('market_symbols')
    .select('symbol, provider_symbol, name, asset_type, exchange, country, currency')
    .eq('is_active', true)
    .limit(16);

  if (assetType) request = request.eq('asset_type', assetType);

  if (query) {
    const like = `%${query}%`;
    request = request.or(`symbol.ilike.${like},provider_symbol.ilike.${like},name.ilike.${like},exchange.ilike.${like}`);
  }

  const { data, error } = await request;
  if (error) return [];
  return (data ?? []).map(row => mapMarketSymbol(row as MarketSymbolRow));
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
    const key = `${normalized.symbol}:${normalized.assetType}`;
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
  const yahooCurrency = quote.currency?.toUpperCase();
  const providerSymbols = quoteSymbols(candidate);
  const isKuwaitFils = yahooCurrency === 'KWF' || providerSymbols.some(symbol => symbol.endsWith('.KW'));
  if (!isKuwaitFils) {
    return {
      price: quote.price,
      change: quote.change,
      currency: quote.currency ?? candidate.currency ?? null,
    };
  }

  return {
    price: quote.price === null ? null : quote.price / 1000,
    change: quote.change === null ? null : quote.change / 1000,
    currency: 'KWD',
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

  if (query.length < 2) {
    return NextResponse.json({ ok: true, query, items: [], message: 'NO_RESULTS' });
  }

  try {
    const aliasCandidates = findAssetAliasMatches(query).map(candidateFromAlias);
    const shouldSearchUSUniverse = !assetType || assetType === 'stock' || assetType === 'etf';
    const [supabaseCandidates, usResults, proxyResult, directCandidate] = await Promise.all([
      searchSupabaseSymbols(query, assetType),
      shouldSearchUSUniverse ? searchUSSymbols(query, assetType) : Promise.resolve(null),
      proxySearch(query, assetType),
      directQuoteCandidate(query, assetType),
    ]);

    const proxyItems = Array.isArray(proxyResult?.results)
      ? proxyResult.results as MarketSearchItem[]
      : [];
    const mergedSearchItems = mergeMarketSearchResults(
      proxyItems,
      usResults?.results ?? [],
    ).slice(0, 16);

    const candidates = dedupeCandidates([
      ...aliasCandidates,
      ...supabaseCandidates,
      ...mergedSearchItems.map(item => candidateFromSearchItem(item, usResults ? `market_search+${usResults.source}` : 'market_search')),
      ...(directCandidate ? [directCandidate] : []),
    ]).slice(0, MAX_RESULTS);

    const enriched = await Promise.allSettled(candidates.map(enrichCandidate));
    const items = enriched
      .filter((result): result is PromiseFulfilledResult<AssetSearchItem> => result.status === 'fulfilled')
      .map(result => result.value)
      .filter((item, index, list) => list.findIndex(entry => `${entry.symbol}:${entry.asset_type}` === `${item.symbol}:${item.asset_type}`) === index)
      .filter(item => item.search_source !== 'direct_quote' || item.available)
      .slice(0, MAX_RESULTS);

    return NextResponse.json({
      ok: true,
      query,
      items,
      message: items.length > 0 ? undefined : 'NO_RESULTS',
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
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
