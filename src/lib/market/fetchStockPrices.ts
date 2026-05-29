import type { TechStockConfig } from '@/lib/market/techStocks';

export type TechStockPrice = {
  symbol: string;
  price: number | null;
  changePercent: number | null;
  source: 'Finnhub';
};

type FinnhubQuote = {
  c?: number;
  dp?: number;
};

async function fetchFinnhubJson<T>(url: string) {
  const response = await fetch(url, {
    next: { revalidate: 1800 },
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Finnhub returned ${response.status}`);
  return response.json() as Promise<T>;
}

export async function fetchStockPrices(stocks: TechStockConfig[], apiKey: string) {
  const settled = await Promise.allSettled(
    stocks.map(async stock => {
      const params = new URLSearchParams({ symbol: stock.symbol, token: apiKey });
      const quote = await fetchFinnhubJson<FinnhubQuote>(`https://finnhub.io/api/v1/quote?${params.toString()}`);
      return {
        symbol: stock.symbol,
        price: Number.isFinite(Number(quote.c)) && Number(quote.c) > 0 ? Number(quote.c) : null,
        changePercent: Number.isFinite(Number(quote.dp)) ? Number(quote.dp) : null,
        source: 'Finnhub' as const,
      };
    }),
  );

  return new Map<string, TechStockPrice>(
    settled
      .map((result, index) => result.status === 'fulfilled'
        ? result.value
        : {
          symbol: stocks[index]?.symbol ?? '',
          price: null,
          changePercent: null,
          source: 'Finnhub' as const,
        })
      .filter(price => price.symbol)
      .map(price => [price.symbol, price]),
  );
}
