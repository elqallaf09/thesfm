import type { TechStockConfig } from '@/lib/market/techStocks';
import { fetchYahooChartQuote, fetchYahooQuote } from '@/lib/market/fetchYahooQuote';

export type TechStockPrice = {
  symbol: string;
  price: number | null;
  changePercent: number | null;
  change: number | null;
  source: 'Finnhub' | 'Yahoo Finance';
  delayed: true;
  available: boolean;
  unavailableReason?: string;
};

type FinnhubQuote = {
  c?: number;
  d?: number;
  dp?: number;
};

function devLog(message: string, meta: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_MARKET_DATA === 'true') {
    console.info(message, meta);
  }
}

function numberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeFinnhubQuote(symbol: string, quote: FinnhubQuote): TechStockPrice {
  const price = numberOrNull(quote.c);
  const change = numberOrNull(quote.d);
  const changePercent = numberOrNull(quote.dp);
  const available = price !== null && price > 0;

  return {
    symbol,
    price: available ? price : null,
    change: available ? change : null,
    changePercent: available ? changePercent : null,
    source: 'Finnhub',
    delayed: true,
    available,
    ...(available ? {} : { unavailableReason: 'provider_returned_empty_quote' }),
  };
}

function unavailableFinnhubPrice(symbol: string, unavailableReason: string): TechStockPrice {
  return {
    symbol,
    price: null,
    change: null,
    changePercent: null,
    source: 'Finnhub',
    delayed: true,
    available: false,
    unavailableReason,
  };
}

async function fetchFinnhubQuote(symbol: string, apiKey: string): Promise<TechStockPrice> {
  const safeUrl = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}`;
  const params = new URLSearchParams({ symbol, token: apiKey });
  const response = await fetch(`https://finnhub.io/api/v1/quote?${params.toString()}`, {
    next: { revalidate: 300 },
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });

  let quote: FinnhubQuote = {};
  let unavailableReason = '';
  try {
    quote = await response.json() as FinnhubQuote;
  } catch {
    unavailableReason = 'provider_returned_invalid_json';
  }

  if (!response.ok) {
    unavailableReason = `provider_http_${response.status}`;
  }

  const normalized = unavailableReason
    ? unavailableFinnhubPrice(symbol, unavailableReason)
    : normalizeFinnhubQuote(symbol, quote);

  devLog('[TechNews] Finnhub quote response', {
    symbol,
    url: safeUrl,
    status: response.status,
    rawQuoteKeys: Object.keys(quote),
    parsed: {
      c: numberOrNull(quote.c),
      d: numberOrNull(quote.d),
      dp: numberOrNull(quote.dp),
    },
    unavailableReason: normalized.unavailableReason ?? null,
  });

  return normalized;
}

function hasUsableFinnhubKey(apiKey?: string) {
  const key = apiKey?.trim();
  return Boolean(key && key !== 'your_key_here');
}

async function fetchPriceWithFallback(stock: TechStockConfig, apiKey?: string) {
  let finnhubPrice = unavailableFinnhubPrice(stock.symbol, 'finnhub_api_key_not_configured');
  if (hasUsableFinnhubKey(apiKey)) {
    try {
      finnhubPrice = await fetchFinnhubQuote(stock.symbol, apiKey);
    } catch (error) {
      finnhubPrice = unavailableFinnhubPrice(
        stock.symbol,
        error instanceof Error ? error.message : 'finnhub_quote_failed',
      );
      devLog('[TechNews] Finnhub quote failed before normalization', {
        symbol: stock.symbol,
        unavailableReason: finnhubPrice.unavailableReason,
      });
    }
  }

  if (finnhubPrice.available) return finnhubPrice;

  const yahooPrice = await fetchYahooQuote(stock.symbol).catch(error => ({
    symbol: stock.symbol,
    price: null,
    change: null,
    changePercent: null,
    source: 'Yahoo Finance' as const,
    delayed: true as const,
    available: false,
    unavailableReason: error instanceof Error ? error.message : 'yahoo_quote_failed',
  }));
  if (yahooPrice.available) return yahooPrice;

  const yahooChartPrice = await fetchYahooChartQuote(stock.symbol).catch(error => ({
    symbol: stock.symbol,
    price: null,
    change: null,
    changePercent: null,
    source: 'Yahoo Finance' as const,
    delayed: true as const,
    available: false,
    unavailableReason: error instanceof Error ? error.message : 'yahoo_chart_quote_failed',
  }));
  if (yahooChartPrice.available) return yahooChartPrice;

  return {
    ...finnhubPrice,
    unavailableReason: yahooChartPrice.unavailableReason ?? yahooPrice.unavailableReason ?? finnhubPrice.unavailableReason,
  };
}

export async function fetchStockPrices(stocks: TechStockConfig[], apiKey?: string) {
  const settled = await Promise.allSettled(
    stocks.map(stock => fetchPriceWithFallback(stock, apiKey)),
  );

  return new Map<string, TechStockPrice>(
    settled
      .map((result, index) => result.status === 'fulfilled'
        ? result.value
        : {
          symbol: stocks[index]?.symbol ?? '',
          price: null,
          changePercent: null,
          change: null,
          source: 'Finnhub' as const,
          delayed: true as const,
          available: false,
          unavailableReason: result.reason instanceof Error ? result.reason.message : 'price_fetch_failed',
        })
      .filter(price => price.symbol)
      .map(price => [price.symbol, price]),
  );
}
