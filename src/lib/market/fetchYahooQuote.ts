import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
import { cryptoQuoteRejectionReason, type CanonicalAssetClass } from '@/lib/market/canonicalSymbols';

type YahooQuoteResponse = {
  quoteResponse?: {
    result?: Array<{
      symbol?: string;
      shortName?: string;
      longName?: string;
      currency?: string;
      exchange?: string;
      exchangeName?: string;
      fullExchangeName?: string;
      quoteSourceName?: string;
      market?: string;
      quoteType?: string;
      regularMarketPrice?: number;
      regularMarketChange?: number;
      regularMarketChangePercent?: number;
      regularMarketTime?: number;
    }>;
  };
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        shortName?: string;
        longName?: string;
        currency?: string;
        exchange?: string;
        exchangeName?: string;
        fullExchangeName?: string;
        quoteSourceName?: string;
        market?: string;
        quoteType?: string;
        instrumentType?: string;
        regularMarketPrice?: number;
        regularMarketTime?: number;
        previousClose?: number;
        chartPreviousClose?: number;
      };
    }>;
  };
};

export type YahooNormalizedQuote = {
  requestedSymbol: string;
  symbolUsed: string | null;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string | null;
  exchange: string | null;
  exchangeCode: string | null;
  market: string | null;
  assetType: string | null;
  marketTime: string | null;
  source: 'Yahoo Finance';
  delayed: true;
  available: boolean;
  unavailableReason?: string;
};

function devLog(message: string, meta: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_MARKET_DATA === 'true') {
    console.info(message, meta);
  }
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function marketTimeFromUnix(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? new Date(parsed * 1000).toISOString() : null;
}

function unavailableNormalizedQuote(requestedSymbol: string, name: string, unavailableReason: string): YahooNormalizedQuote {
  return {
    requestedSymbol,
    symbolUsed: null,
    name,
    price: null,
    change: null,
    changePercent: null,
    currency: null,
    exchange: null,
    exchangeCode: null,
    market: null,
    assetType: null,
    marketTime: null,
    source: 'Yahoo Finance',
    delayed: true,
    available: false,
    unavailableReason,
  };
}

function unavailableYahooPrice(symbol: string, unavailableReason: string): TechStockPrice {
  return {
    symbol,
    price: null,
    change: null,
    changePercent: null,
    source: 'Yahoo Finance',
    delayed: true,
    available: false,
    unavailableReason,
  };
}

function logYahooQuoteDebug(message: string, meta: Record<string, unknown>, rejected = false) {
  if (rejected) {
    console.warn(message, meta);
    return;
  }
  devLog(message, meta);
}

function yahooCryptoRejection(input: {
  requestedSymbol: string;
  canonicalSymbol?: string;
  assetClass?: CanonicalAssetClass | string | null;
  providerSymbol: string;
  responseSymbol?: string | null;
  responseName?: string | null;
  responseAssetType?: string | null;
  responsePrice?: number | null;
}) {
  return cryptoQuoteRejectionReason({
    requestedSymbol: input.requestedSymbol,
    canonicalSymbol: input.canonicalSymbol,
    assetClass: input.assetClass,
    provider: 'yahoo',
    providerSymbol: input.providerSymbol,
    responseSymbol: input.responseSymbol,
    responseName: input.responseName,
    responseAssetType: input.responseAssetType,
    responsePrice: input.responsePrice,
  });
}

export async function fetchYahooQuote(symbol: string): Promise<TechStockPrice> {
  const params = new URLSearchParams({ symbols: symbol });
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?${params.toString()}`;
  const response = await fetch(url, {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(8000),
    headers: {
      accept: 'application/json',
      'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)',
    },
  });

  let body: YahooQuoteResponse | null = null;
  try {
    body = await response.json() as YahooQuoteResponse;
  } catch {
    body = null;
  }

  const quote = body?.quoteResponse?.result?.[0];
  const price = numberOrNull(quote?.regularMarketPrice);
  const change = numberOrNull(quote?.regularMarketChange);
  const changePercent = numberOrNull(quote?.regularMarketChangePercent);
  const available = response.ok && price !== null && price > 0;
  const unavailableReason = response.ok
    ? 'provider_returned_empty_quote'
    : `provider_http_${response.status}`;

  devLog('[TechNews] Yahoo quote response', {
    symbol,
    url,
    status: response.status,
    rawQuoteKeys: quote ? Object.keys(quote) : [],
    parsed: {
      regularMarketPrice: price,
      regularMarketChange: change,
      regularMarketChangePercent: changePercent,
    },
    unavailableReason: available ? null : unavailableReason,
  });

  if (!available) return unavailableYahooPrice(symbol, unavailableReason);

  return {
    symbol,
    price,
    change,
    changePercent,
    source: 'Yahoo Finance',
    delayed: true,
    available: true,
  };
}

export async function fetchYahooChartQuote(symbol: string): Promise<TechStockPrice> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
  const response = await fetch(url, {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(8000),
    headers: {
      accept: 'application/json',
      'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)',
    },
  });

  let body: YahooChartResponse | null = null;
  try {
    body = await response.json() as YahooChartResponse;
  } catch {
    body = null;
  }

  const meta = body?.chart?.result?.[0]?.meta;
  const price = numberOrNull(meta?.regularMarketPrice);
  const previousClose = numberOrNull(meta?.previousClose) ?? numberOrNull(meta?.chartPreviousClose);
  const change = price !== null && previousClose !== null ? price - previousClose : null;
  const changePercent = change !== null && previousClose !== null && previousClose > 0
    ? (change / previousClose) * 100
    : null;
  const available = response.ok && price !== null && price > 0;
  const unavailableReason = response.ok
    ? 'provider_returned_empty_quote'
    : `provider_http_${response.status}`;

  devLog('[TechNews] Yahoo chart quote response', {
    symbol,
    url,
    status: response.status,
    rawQuoteKeys: meta ? Object.keys(meta) : [],
    parsed: {
      regularMarketPrice: price,
      regularMarketChange: change,
      regularMarketChangePercent: changePercent,
    },
    unavailableReason: available ? null : unavailableReason,
  });

  if (!available) return unavailableYahooPrice(symbol, unavailableReason);

  return {
    symbol,
    price,
    change,
    changePercent,
    source: 'Yahoo Finance',
    delayed: true,
    available: true,
  };
}

function yahooRequestOptions(forceFresh?: boolean) {
  return {
    ...(forceFresh ? { cache: 'no-store' as const } : { next: { revalidate: 300 } }),
    signal: AbortSignal.timeout(8000),
    headers: {
      accept: 'application/json',
      'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)',
    },
  };
}

async function fetchYahooQuoteEndpoint(
  symbol: string,
  requestedSymbol: string,
  name: string,
  debugContext?: Record<string, unknown>,
  forceFresh?: boolean,
  canonicalContext?: {
    canonicalSymbol?: string;
    assetClass?: CanonicalAssetClass | string | null;
    expectedName?: string;
  },
): Promise<YahooNormalizedQuote> {
  const params = new URLSearchParams({ symbols: symbol });
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?${params.toString()}`;
  const response = await fetch(url, yahooRequestOptions(forceFresh));

  let body: YahooQuoteResponse | null = null;
  try {
    body = await response.json() as YahooQuoteResponse;
  } catch {
    body = null;
  }

  const quote = body?.quoteResponse?.result?.[0];
  const price = numberOrNull(quote?.regularMarketPrice);
  const change = numberOrNull(quote?.regularMarketChange);
  const changePercent = numberOrNull(quote?.regularMarketChangePercent);
  const available = response.ok && price !== null && price > 0;
  const unavailableReason = response.ok ? 'provider_returned_empty_quote' : `provider_http_${response.status}`;

  devLog('[MarketData] Yahoo quote endpoint response', {
    ...debugContext,
    canonicalSymbol: canonicalContext?.canonicalSymbol,
    assetClass: canonicalContext?.assetClass,
    requestedSymbol,
    providerSymbolSent: symbol,
    provider: 'yahoo',
    url,
    status: response.status,
    responseName: quote?.longName ?? quote?.shortName ?? null,
    responsePrice: price,
    rawQuoteKeys: quote ? Object.keys(quote) : [],
    parsedPrice: price,
    parsedChangePercent: changePercent,
    unavailableReason: available ? null : unavailableReason,
  });

  if (!available) return unavailableNormalizedQuote(requestedSymbol, name, unavailableReason);
  const rejectionReason = yahooCryptoRejection({
    requestedSymbol,
    canonicalSymbol: canonicalContext?.canonicalSymbol,
    assetClass: canonicalContext?.assetClass,
    providerSymbol: symbol,
    responseSymbol: quote?.symbol ?? symbol,
    responseName: quote?.longName ?? quote?.shortName ?? canonicalContext?.expectedName ?? name,
    responseAssetType: quote?.quoteType,
    responsePrice: price,
  });
  if (rejectionReason) {
    logYahooQuoteDebug('[MarketData] Yahoo quote rejected', {
      ...debugContext,
      canonicalSymbol: canonicalContext?.canonicalSymbol,
      assetClass: canonicalContext?.assetClass,
      providerSymbolSent: symbol,
      provider: 'yahoo',
      responseName: quote?.longName ?? quote?.shortName ?? null,
      responsePrice: price,
      rejectionReason,
    }, true);
    return unavailableNormalizedQuote(requestedSymbol, name, rejectionReason);
  }

  return {
    requestedSymbol,
    symbolUsed: quote?.symbol ?? symbol,
    name: quote?.longName ?? quote?.shortName ?? name,
    price,
    change,
    changePercent,
    currency: quote?.currency ?? null,
    exchange: quote?.fullExchangeName ?? quote?.exchangeName ?? quote?.exchange ?? quote?.quoteSourceName ?? null,
    exchangeCode: quote?.exchange ?? null,
    market: quote?.market ?? null,
    assetType: quote?.quoteType ?? null,
    marketTime: marketTimeFromUnix(quote?.regularMarketTime),
    source: 'Yahoo Finance',
    delayed: true,
    available: true,
  };
}

async function fetchYahooChartEndpoint(
  symbol: string,
  requestedSymbol: string,
  name: string,
  debugContext?: Record<string, unknown>,
  forceFresh?: boolean,
  canonicalContext?: {
    canonicalSymbol?: string;
    assetClass?: CanonicalAssetClass | string | null;
    expectedName?: string;
  },
): Promise<YahooNormalizedQuote> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2d&interval=1d`;
  const response = await fetch(url, yahooRequestOptions(forceFresh));

  let body: YahooChartResponse | null = null;
  try {
    body = await response.json() as YahooChartResponse;
  } catch {
    body = null;
  }

  const meta = body?.chart?.result?.[0]?.meta;
  const price = numberOrNull(meta?.regularMarketPrice);
  const previousClose = numberOrNull(meta?.chartPreviousClose) ?? numberOrNull(meta?.previousClose);
  const change = price !== null && previousClose !== null ? price - previousClose : null;
  const changePercent = change !== null && previousClose !== null && previousClose > 0
    ? (change / previousClose) * 100
    : null;
  const available = response.ok && price !== null && price > 0;
  const unavailableReason = response.ok ? 'provider_returned_empty_quote' : `provider_http_${response.status}`;

  devLog('[MarketData] Yahoo chart endpoint response', {
    ...debugContext,
    canonicalSymbol: canonicalContext?.canonicalSymbol,
    assetClass: canonicalContext?.assetClass,
    requestedSymbol,
    providerSymbolSent: symbol,
    provider: 'yahoo',
    url,
    status: response.status,
    responseName: meta?.longName ?? meta?.shortName ?? null,
    responsePrice: price,
    rawQuoteKeys: meta ? Object.keys(meta) : [],
    parsedPrice: price,
    parsedChangePercent: changePercent,
    unavailableReason: available ? null : unavailableReason,
  });

  if (!available) return unavailableNormalizedQuote(requestedSymbol, name, unavailableReason);
  const rejectionReason = yahooCryptoRejection({
    requestedSymbol,
    canonicalSymbol: canonicalContext?.canonicalSymbol,
    assetClass: canonicalContext?.assetClass,
    providerSymbol: symbol,
    responseSymbol: meta?.symbol ?? symbol,
    responseName: meta?.longName ?? meta?.shortName ?? canonicalContext?.expectedName ?? name,
    responseAssetType: meta?.quoteType ?? meta?.instrumentType,
    responsePrice: price,
  });
  if (rejectionReason) {
    logYahooQuoteDebug('[MarketData] Yahoo chart rejected', {
      ...debugContext,
      canonicalSymbol: canonicalContext?.canonicalSymbol,
      assetClass: canonicalContext?.assetClass,
      providerSymbolSent: symbol,
      provider: 'yahoo',
      responseName: meta?.longName ?? meta?.shortName ?? null,
      responsePrice: price,
      rejectionReason,
    }, true);
    return unavailableNormalizedQuote(requestedSymbol, name, rejectionReason);
  }

  return {
    requestedSymbol,
    symbolUsed: meta?.symbol ?? symbol,
    name: meta?.longName ?? meta?.shortName ?? name,
    price,
    change,
    changePercent: changePercent !== null && Number.isFinite(changePercent) ? changePercent : null,
    currency: meta?.currency ?? null,
    exchange: meta?.fullExchangeName ?? meta?.exchangeName ?? meta?.exchange ?? meta?.quoteSourceName ?? null,
    exchangeCode: meta?.exchange ?? null,
    market: meta?.market ?? null,
    assetType: meta?.quoteType ?? meta?.instrumentType ?? null,
    marketTime: marketTimeFromUnix(meta?.regularMarketTime),
    source: 'Yahoo Finance',
    delayed: true,
    available: true,
  };
}

export async function fetchYahooNormalizedQuote(options: {
  requestedSymbol: string;
  symbols: string[];
  name: string;
  forceFresh?: boolean;
  canonicalSymbol?: string;
  assetClass?: CanonicalAssetClass | string | null;
  expectedName?: string;
  debugContext?: Record<string, unknown>;
}): Promise<YahooNormalizedQuote> {
  const symbols = options.symbols.filter(Boolean);
  if (symbols.length === 0) {
    devLog('[MarketData] Yahoo quote skipped', {
      ...options.debugContext,
      requestedSymbol: options.requestedSymbol,
      symbolsTried: symbols,
      unavailableReason: 'no_provider_symbol_configured',
    });
    return unavailableNormalizedQuote(options.requestedSymbol, options.name, 'no_provider_symbol_configured');
  }

  let lastUnavailableReason = 'provider_returned_empty_quote';
  for (const symbol of symbols) {
    const quoteResult = await fetchYahooQuoteEndpoint(
      symbol,
      options.requestedSymbol,
      options.name,
      {
        ...options.debugContext,
        symbolsTried: symbols,
      },
      options.forceFresh,
      {
        canonicalSymbol: options.canonicalSymbol,
        assetClass: options.assetClass,
        expectedName: options.expectedName,
      },
    );
    if (quoteResult.available) return quoteResult;
    lastUnavailableReason = quoteResult.unavailableReason ?? lastUnavailableReason;

    const chartResult = await fetchYahooChartEndpoint(
      symbol,
      options.requestedSymbol,
      options.name,
      {
        ...options.debugContext,
        symbolsTried: symbols,
      },
      options.forceFresh,
      {
        canonicalSymbol: options.canonicalSymbol,
        assetClass: options.assetClass,
        expectedName: options.expectedName,
      },
    );
    if (chartResult.available) return chartResult;
    lastUnavailableReason = chartResult.unavailableReason ?? lastUnavailableReason;
  }

  return unavailableNormalizedQuote(options.requestedSymbol, options.name, lastUnavailableReason);
}
