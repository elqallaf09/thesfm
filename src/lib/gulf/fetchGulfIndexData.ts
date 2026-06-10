import { GULF_MARKETS, type GulfIndexSourceStrategy, type GulfMarket, type GulfMarketId } from '@/lib/gulf/gulfMarkets';
import { fetchYahooNormalizedQuote } from '@/lib/market/fetchYahooQuote';

type MsxMarketTodayResponse = {
  d?: Array<{
    MSX30?: string;
    Change?: string;
    ChangeValue?: string;
    AsOnDateEn?: string | null;
    AsOnTimeEn?: string | null;
  }>;
};

export type GulfMarketData = {
  market: GulfMarketId;
  code: GulfMarket['code'];
  name: string;
  indexName: string;
  requestedSymbol: string | null;
  symbolUsed: string | null;
  value: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string | null;
  marketTime: string | null;
  source: string;
  sourceLabel?: string;
  status: 'available' | 'unavailable';
  available: boolean;
  delayed: true;
  updatedAt: string;
  unavailableReason?: string;
};

function shouldDebugMarketData() {
  return process.env.NODE_ENV !== 'production' || process.env.DEBUG_MARKET_DATA === 'true';
}

function debugLog(message: string, meta: Record<string, unknown>) {
  if (shouldDebugMarketData()) console.info(message, meta);
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined) return null;
  const normalized = String(value)
    .replace(/,/g, '')
    .replace(/%/g, '')
    .trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function unavailable(market: GulfMarket, unavailableReason = 'provider_symbol_not_configured'): GulfMarketData {
  return {
    market: market.id,
    code: market.code,
    name: market.nameAr,
    indexName: market.indexName,
    requestedSymbol: market.yahooSymbols[0] ?? null,
    symbolUsed: null,
    value: null,
    change: null,
    changePercent: null,
    currency: null,
    marketTime: null,
    source: 'Data provider',
    status: 'unavailable',
    available: false,
    delayed: true,
    updatedAt: new Date().toISOString(),
    unavailableReason,
  };
}

function available(market: GulfMarket, data: Omit<GulfMarketData, 'market' | 'code' | 'name' | 'status' | 'available' | 'delayed' | 'updatedAt'>): GulfMarketData {
  const now = new Date().toISOString();
  return {
    market: market.id,
    code: market.code,
    name: market.nameAr,
    status: 'available',
    available: true,
    delayed: true,
    updatedAt: data.marketTime ?? now,
    ...data,
  };
}

function isStaleMarketTime(marketTime: string | null, maxAgeDays = 30) {
  if (!marketTime) return false;
  const parsed = Date.parse(marketTime);
  if (!Number.isFinite(parsed)) return false;
  return Date.now() - parsed > maxAgeDays * 24 * 60 * 60 * 1000;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<{ status: number; ok: boolean; body: T | null }> {
  const response = await fetch(url, {
    ...init,
    next: { revalidate: 300 },
    headers: {
      accept: 'application/json',
      'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)',
      ...(init?.headers ?? {}),
    },
  });

  let body: T | null = null;
  try {
    body = await response.json() as T;
  } catch {
    body = null;
  }

  return { status: response.status, ok: response.ok, body };
}

async function fetchHtml(url: string): Promise<{ status: number; ok: boolean; body: string }> {
  const response = await fetch(url, {
    next: { revalidate: 300 },
    headers: {
      accept: 'text/html',
      'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)',
    },
  });
  return { status: response.status, ok: response.ok, body: await response.text() };
}

async function fetchYahooMarketData(market: GulfMarket, source: Extract<GulfIndexSourceStrategy, { provider: 'Yahoo Finance' }>): Promise<GulfMarketData> {
  const quote = await fetchYahooNormalizedQuote({
    requestedSymbol: source.symbol,
    symbols: [source.symbol],
    name: source.label ?? market.indexName,
    debugContext: {
      marketCode: market.code,
      market: market.id,
      provider: source.provider,
      symbolAttempted: source.symbol,
    },
  });

  const stale = quote.available && isStaleMarketTime(quote.marketTime);
  debugLog('[GulfNews] Yahoo index attempt', {
    marketCode: market.code,
    provider: source.provider,
    symbolAttempted: source.symbol,
    parsedValue: quote.price,
    parsedChange: quote.change,
    parsedChangePercent: quote.changePercent,
    marketTime: quote.marketTime,
    unavailableReason: stale ? 'provider_returned_stale_quote' : quote.unavailableReason ?? null,
  });

  if (!quote.available || stale) {
    return unavailable(market, stale ? 'provider_returned_stale_quote' : quote.unavailableReason ?? 'provider_returned_empty_quote');
  }

  return available(market, {
    indexName: source.label ?? market.indexName,
    requestedSymbol: quote.requestedSymbol,
    symbolUsed: quote.symbolUsed,
    value: quote.price,
    change: quote.change,
    changePercent: quote.changePercent,
    currency: quote.currency,
    marketTime: quote.marketTime,
    source: quote.source,
    sourceLabel: source.label,
  });
}

async function fetchMuscatOfficialMarketData(market: GulfMarket): Promise<GulfMarketData> {
  const url = 'https://www.msx.om/api.aspx/MarketToday';
  const result = await fetchJson<MsxMarketTodayResponse>(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: '',
  });
  const row = result.body?.d?.[0];
  const value = numberOrNull(row?.MSX30);
  const changePercent = numberOrNull(row?.Change);
  const change = numberOrNull(row?.ChangeValue);
  const availableQuote = result.ok && value !== null && value > 0;
  const unavailableReason = result.ok ? 'provider_returned_empty_quote' : `provider_http_${result.status}`;

  debugLog('[GulfNews] Official index attempt', {
    marketCode: market.code,
    provider: 'Muscat Stock Exchange',
    symbolAttempted: 'MSX30',
    responseStatus: result.status,
    parsedValue: value,
    parsedChange: change,
    parsedChangePercent: changePercent,
    unavailableReason: availableQuote ? null : unavailableReason,
  });

  if (!availableQuote) return unavailable(market, unavailableReason);

  return available(market, {
    indexName: market.indexName,
    requestedSymbol: 'MSX30',
    symbolUsed: 'MSX30',
    value,
    change,
    changePercent,
    currency: 'OMR',
    marketTime: null,
    source: 'Muscat Stock Exchange',
    sourceLabel: 'Muscat Stock Exchange',
  });
}

async function fetchBahrainOfficialMarketData(market: GulfMarket): Promise<GulfMarketData> {
  const url = 'https://bahrainbourse.com/en/Market/Pages/market-watch.aspx';
  const result = await fetchHtml(url);
  const blocked = result.status === 403 || /Cloudflare|Attention Required/i.test(result.body);
  const unavailableReason = blocked ? 'provider_blocked_server_fetch' : result.ok ? 'official_parser_not_stable' : `provider_http_${result.status}`;

  debugLog('[GulfNews] Official index attempt', {
    marketCode: market.code,
    provider: 'Bahrain Bourse',
    symbolAttempted: 'Bahrain All Share Index',
    responseStatus: result.status,
    unavailableReason,
  });

  return unavailable(market, unavailableReason);
}

function parseMubasherMarketSummary(html: string) {
  const pick = (className: string) => {
    const pattern = new RegExp(`<div[^>]*class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)<\\/div>`, 'i');
    const match = html.match(pattern);
    return match?.[1]?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() ?? null;
  };

  return {
    value: numberOrNull(pick('market-summary__last-price')),
    change: numberOrNull(pick('market-summary__change number')),
    changePercent: numberOrNull(pick('market-summary__change-percentage')),
  };
}

async function fetchMubasherMarketData(market: GulfMarket, source: Extract<GulfIndexSourceStrategy, { provider: 'Mubasher' }>): Promise<GulfMarketData> {
  const url = market.id === 'bahrain'
    ? 'https://www.mubasher.info/markets/BB'
    : 'https://www.mubasher.info/markets/MSM/indices/MSX30/';
  const result = await fetchHtml(url);
  const parsed = parseMubasherMarketSummary(result.body);
  const availableQuote = result.ok && parsed.value !== null && parsed.value > 0;
  const unavailableReason = result.ok ? 'provider_returned_empty_quote' : `provider_http_${result.status}`;

  debugLog('[GulfNews] Mubasher index attempt', {
    marketCode: market.code,
    provider: source.provider,
    symbolAttempted: source.symbol,
    responseStatus: result.status,
    parsedValue: parsed.value,
    parsedChange: parsed.change,
    parsedChangePercent: parsed.changePercent,
    unavailableReason: availableQuote ? null : unavailableReason,
  });

  if (!availableQuote) return unavailable(market, unavailableReason);

  return available(market, {
    indexName: source.label ?? market.indexName,
    requestedSymbol: source.symbol,
    symbolUsed: source.symbol,
    value: parsed.value,
    change: parsed.change,
    changePercent: parsed.changePercent,
    currency: market.id === 'oman' ? 'OMR' : 'BHD',
    marketTime: null,
    source: 'Mubasher',
    sourceLabel: source.label,
  });
}

async function fetchInvestingMarketData(market: GulfMarket, source: Extract<GulfIndexSourceStrategy, { provider: 'Investing' }>): Promise<GulfMarketData> {
  debugLog('[GulfNews] Investing index attempt skipped', {
    marketCode: market.code,
    provider: source.provider,
    symbolAttempted: source.symbol,
    unavailableReason: 'provider_not_used_without_stable_public_endpoint',
  });
  return unavailable(market, 'provider_not_used_without_stable_public_endpoint');
}

async function fetchSourceMarketData(market: GulfMarket, source: GulfIndexSourceStrategy): Promise<GulfMarketData> {
  if (source.provider === 'Yahoo Finance') return fetchYahooMarketData(market, source);
  if (source.provider === 'Muscat Stock Exchange') return fetchMuscatOfficialMarketData(market);
  if (source.provider === 'Bahrain Bourse') return fetchBahrainOfficialMarketData(market);
  if (source.provider === 'Mubasher') return fetchMubasherMarketData(market, source);
  return fetchInvestingMarketData(market, source as Extract<GulfIndexSourceStrategy, { provider: 'Investing' }>);
}

async function fetchMarketData(market: GulfMarket): Promise<GulfMarketData> {
  let lastUnavailableReason = 'provider_symbol_not_configured';
  for (const source of market.preferredSources) {
    const result = await fetchSourceMarketData(market, source);
    if (result.available) return result;
    lastUnavailableReason = result.unavailableReason ?? lastUnavailableReason;
  }
  return unavailable(market, lastUnavailableReason);
}

export async function fetchDelayedGulfMarketData() {
  const settled = await Promise.allSettled(GULF_MARKETS.map(market => fetchMarketData(market)));
  return settled.reduce<Record<GulfMarketId, GulfMarketData>>((acc, result, index) => {
    const market = GULF_MARKETS[index];
    acc[market.id] = result.status === 'fulfilled'
      ? result.value
      : unavailable(market, result.reason instanceof Error ? result.reason.message : 'market_data_fetch_failed');
    return acc;
  }, {} as Record<GulfMarketId, GulfMarketData>);
}

export function gulfMarketDataToApiMarkets(marketData: Record<GulfMarketId, GulfMarketData>) {
  return GULF_MARKETS.map(market => {
    const data = marketData[market.id] ?? unavailable(market);
    return {
      code: market.code,
      name: data.name,
      indexName: data.indexName,
      requestedSymbol: data.requestedSymbol,
      symbolUsed: data.symbolUsed,
      value: data.value,
      change: data.change,
      changePercent: data.changePercent,
      currency: data.currency,
      marketTime: data.marketTime,
      source: data.source,
      sourceLabel: data.sourceLabel,
      delayed: data.delayed,
      available: data.available,
      unavailableReason: data.unavailableReason,
    };
  });
}
