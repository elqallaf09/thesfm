import { getQuoteWithFallback } from '@/lib/market/marketDataProviders';
import type { WorldStock, WorldStockQuote } from './types';

export type WorldStockQuoteRequest = Pick<WorldStock, 'canonicalSymbol' | 'providerSymbol' | 'exchangeCode' | 'assetType' | 'currency'>;

/**
 * Fetches quotes only for the symbols passed in -- callers must pass just
 * the current visible page (bounded by the same pageSize as search), never
 * the full result set. Requests are deduplicated by canonical symbol before
 * fetching and run in parallel with a bounded concurrency-free Promise.all
 * (the page size is already small, 20-30 symbols).
 */
export async function fetchWorldStockQuotes(requests: WorldStockQuoteRequest[]): Promise<{ quotes: Record<string, WorldStockQuote>; partialFailure: boolean }> {
  const unique = new Map<string, WorldStockQuoteRequest>();
  for (const request of requests) {
    if (!request.canonicalSymbol) continue;
    if (!unique.has(request.canonicalSymbol)) unique.set(request.canonicalSymbol, request);
  }

  const quotes: Record<string, WorldStockQuote> = {};
  let partialFailure = false;

  await Promise.all(Array.from(unique.values()).map(async request => {
    try {
      const result = await getQuoteWithFallback(request.providerSymbol, request.exchangeCode, {
        symbol: request.canonicalSymbol,
        market: request.exchangeCode,
        assetType: request.assetType,
        currency: request.currency,
      });

      if (result.ok) {
        quotes[request.canonicalSymbol] = {
          price: result.data.price,
          change: result.data.change,
          changePercent: result.data.changePercent,
          currency: result.data.currency ?? request.currency ?? null,
          quoteTimestamp: new Date().toISOString(),
          delayed: result.data.delayType !== 'realtime',
          dataSource: result.data.providerName,
          status: 'available',
        };
      } else {
        partialFailure = true;
        quotes[request.canonicalSymbol] = {
          price: null,
          change: null,
          changePercent: null,
          currency: request.currency ?? null,
          quoteTimestamp: null,
          delayed: true,
          dataSource: null,
          status: 'unavailable',
        };
      }
    } catch {
      partialFailure = true;
      quotes[request.canonicalSymbol] = {
        price: null,
        change: null,
        changePercent: null,
        currency: request.currency ?? null,
        quoteTimestamp: null,
        delayed: true,
        dataSource: null,
        status: 'unavailable',
      };
    }
  }));

  return { quotes, partialFailure };
}
