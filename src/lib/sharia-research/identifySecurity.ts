import 'server-only';

import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { marketExchangeAliases, normalizeMarketExchange } from '@/lib/market/marketExchangeOptions';
import { searchBundledMarketSymbols } from '@/lib/market/marketSymbolDirectory';
import { searchUSSymbols } from '@/lib/market/usSymbolResolver';
import { normalizeQuery, normalizeResearchText, isValidIsin } from './normalizeQuery';
import { loadSecCompanyDirectory, searchSecCompanies } from './secData';
import type { IdentityResolution, SecurityCandidate, SecurityIdentity } from './types';

function canonicalId(exchange: string, ticker: string, isin?: string | null) {
  return isin || `${exchange || 'UNKNOWN'}:${ticker}`.toUpperCase();
}

function secCandidate(match: ReturnType<typeof searchSecCompanies>[number], retrievedAt: string): SecurityCandidate {
  const { company, score, matchedOn } = match;
  const browseUrl = `https://www.sec.gov/edgar/browse/?CIK=${company.cik}`;
  return {
    canonicalId: canonicalId(company.exchange, company.ticker),
    name: company.name,
    ticker: company.ticker,
    providerSymbol: company.ticker.replace(/\./g, '-'),
    exchange: company.exchange,
    cik: company.cik,
    country: 'US',
    currency: 'USD',
    aliases: [company.name, company.ticker],
    previousNames: [],
    identitySources: [{ title: 'SEC company ticker directory', url: browseUrl, publisher: 'U.S. Securities and Exchange Commission', retrievedAt, tier: 1 }],
    score,
    matchedOn,
  };
}

async function databaseCandidates(query: ReturnType<typeof normalizeQuery>) {
  const admin = createServerSupabaseAdmin();
  if (!admin) return [];
  const needle = query.possibleIsin || query.possibleTicker || query.original.replace(/[%,]/g, '').slice(0, 80);
  const identities = await admin
    .from('sharia_security_identities')
    .select('id,canonical_id,company_name,company_name_ar,ticker,provider_symbol,exchange,exchange_mic,isin,cik,lei,country,sector,industry,currency,logo_url,website,last_verified_at,aliases,previous_names,identity_sources,updated_at')
    .or(`isin.eq.${needle},ticker.ilike.${needle},provider_symbol.ilike.${needle},company_name.ilike.%${needle}%,company_name_ar.ilike.%${needle}%`)
    .limit(12);
  if (identities.error || !identities.data) return [];
  return identities.data.map((row): SecurityCandidate => {
    const names = [row.company_name, row.company_name_ar, ...(Array.isArray(row.aliases) ? row.aliases : []), ...(Array.isArray(row.previous_names) ? row.previous_names : [])];
    const normalizedNeedle = normalizeResearchText(query.latinAlias || query.original);
    const exactTicker = String(row.ticker).toUpperCase() === query.possibleTicker;
    const exactIsin = row.isin && String(row.isin).toUpperCase() === query.possibleIsin;
    const exactName = names.some(name => normalizeResearchText(name) === normalizedNeedle);
    const score = exactIsin ? 150 : exactTicker ? 135 : exactName ? 122 : 80;
    return {
      id: String(row.id),
      canonicalId: String(row.canonical_id),
      name: String(row.company_name),
      nameAr: row.company_name_ar,
      ticker: String(row.ticker).toUpperCase(),
      providerSymbol: String(row.provider_symbol || row.ticker).toUpperCase(),
      exchange: String(row.exchange),
      exchangeMic: row.exchange_mic,
      isin: row.isin,
      cik: row.cik,
      lei: row.lei,
      country: row.country,
      sector: row.sector,
      industry: row.industry,
      currency: row.currency,
      logoUrl: row.logo_url,
      website: row.website,
      lastVerifiedAt: row.last_verified_at,
      aliases: Array.isArray(row.aliases) ? row.aliases.map(String) : [],
      previousNames: Array.isArray(row.previous_names) ? row.previous_names.map(String) : [],
      identitySources: Array.isArray(row.identity_sources) ? row.identity_sources as SecurityIdentity['identitySources'] : [],
      score,
      matchedOn: [exactIsin ? 'isin' : exactTicker ? 'ticker' : exactName ? 'name_or_alias' : 'database_search'],
    };
  });
}

function localCandidate(item: ReturnType<typeof searchBundledMarketSymbols>[number], score: number): SecurityCandidate {
  return {
    canonicalId: canonicalId(item.exchange ?? 'UNKNOWN', item.symbol),
    name: item.name,
    nameAr: item.companyNameAr,
    ticker: item.symbol.toUpperCase(),
    providerSymbol: (item.providerSymbol ?? item.symbol).toUpperCase(),
    exchange: item.exchange ?? 'UNKNOWN',
    country: item.country,
    currency: item.currency,
    sector: undefined,
    aliases: item.aliases ?? [],
    previousNames: [],
    identitySources: [],
    score,
    matchedOn: ['project_market_directory', ...(item.exchangeId ? [`market:${item.exchangeId}`] : [])],
  };
}

function candidateMatchesMarket(candidate: SecurityCandidate, market: NonNullable<ReturnType<typeof normalizeMarketExchange>>) {
  if (candidate.matchedOn.includes(`market:${market}`) || normalizeMarketExchange(candidate.exchange) === market) return true;
  const exchange = normalizeResearchText(candidate.exchange);
  return marketExchangeAliases(market).some(alias => {
    const normalizedAlias = normalizeResearchText(alias);
    return exchange === normalizedAlias || exchange.startsWith(`${normalizedAlias} `);
  });
}

function dedupeCandidates(candidates: SecurityCandidate[]) {
  const map = new Map<string, SecurityCandidate>();
  for (const candidate of candidates) {
    const key = candidate.isin || `${candidate.exchange}:${candidate.ticker}`.toUpperCase();
    const existing = map.get(key);
    if (!existing) map.set(key, candidate);
    else map.set(key, {
      ...existing,
      ...candidate,
      score: Math.max(existing.score, candidate.score),
      aliases: Array.from(new Set([...existing.aliases, ...candidate.aliases])),
      previousNames: Array.from(new Set([...existing.previousNames, ...candidate.previousNames])),
      identitySources: [...existing.identitySources, ...candidate.identitySources].filter((source, index, all) => all.findIndex(item => item.url === source.url) === index),
      matchedOn: Array.from(new Set([...existing.matchedOn, ...candidate.matchedOn])),
    });
  }
  return Array.from(map.values()).sort((a, b) => b.score - a.score || a.ticker.localeCompare(b.ticker));
}

export async function identifySecurity(input: unknown, signal?: AbortSignal, marketHint?: string | null): Promise<IdentityResolution> {
  const normalizedQuery = normalizeQuery(input);
  const requestedExchange = normalizeMarketExchange(marketHint) ?? normalizeMarketExchange(normalizedQuery.exchangeHint);
  const query = requestedExchange ? { ...normalizedQuery, exchangeHint: requestedExchange } : normalizedQuery;
  if (!query.original) return { status: 'not_found', query, candidates: [], reason: 'EMPTY_QUERY' };
  if (query.possibleIsin && !isValidIsin(query.possibleIsin)) {
    return { status: 'not_found', query, candidates: [], reason: 'INVALID_ISIN_CHECK_DIGIT' };
  }

  const hasExplicitExchange = Boolean(marketHint || query.exchangeHint);
  const searchValue = hasExplicitExchange && query.possibleTicker
    ? query.possibleTicker
    : query.latinAlias || query.original;
  const collected: SecurityCandidate[] = await databaseCandidates(query);

  const bundled = searchBundledMarketSymbols({ query: searchValue, exchange: requestedExchange, limit: 12 });
  collected.push(...bundled.map(item => localCandidate(item, (
    query.possibleTicker === item.symbol.toUpperCase() ? 125
      : normalizeResearchText(item.name) === normalizeResearchText(searchValue) ? 110
        : 72
  ))));

  if (!hasExplicitExchange || requestedExchange === 'US') {
    try {
      const companies = await loadSecCompanyDirectory(signal);
      const matches = searchSecCompanies(companies, searchValue).slice(0, 12);
      collected.push(...matches.map(match => secCandidate(match, new Date().toISOString())));
    } catch {
      try {
        const us = await searchUSSymbols(searchValue, 'stock');
        if (us.source === 'nasdaqtrader') {
          collected.push(...us.results.map(item => localCandidate(item as ReturnType<typeof searchBundledMarketSymbols>[number], 82)));
        }
      } catch {
        // Identity providers are independent; remaining candidates may still be enough.
      }
    }
  }

  const candidates = dedupeCandidates(collected)
    .filter(candidate => !hasExplicitExchange || (
      requestedExchange !== null
      && candidateMatchesMarket(candidate, requestedExchange)
    ))
    .filter(candidate => candidate.score >= 60)
    .slice(0, 10);
  if (candidates.length === 0) return { status: 'not_found', query, candidates, reason: query.possibleIsin ? 'ISIN_NOT_FOUND' : 'SECURITY_NOT_FOUND' };
  const [first, second] = candidates;
  const exactIdentifier = first.score >= 125;
  const ambiguous = Boolean(second && (
    second.score === first.score
    || (!exactIdentifier && first.score - second.score <= 10)
  ));
  if (ambiguous) return { status: 'ambiguous', query, candidates };
  const { score: _score, matchedOn: _matchedOn, ...security } = first;
  return { status: 'resolved', query, security, candidates };
}
