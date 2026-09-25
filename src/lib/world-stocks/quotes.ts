import { providerRegion } from './providerDirectory';
import { providerStockQuote } from './providerQuote';
import { worldStockQuoteKey } from './quoteKey';
import { observationIso } from '@/lib/market/quoteObservation';
import { getQuoteWithFallback } from '@/lib/market/marketDataProviders';
import type { WorldStock, WorldStockQuote } from './types';

export type WorldStockQuoteRequest = Pick<WorldStock, 'canonicalSymbol' | 'providerSymbol' | 'exchangeCode' | 'assetType' | 'currency'>;

/**
 * Fetches quotes only for the symbols passed in -- callers must pass just
 * the current visible page (bounded by the same pageSize as search), never
 * the full result set. Requests are deduplicated by exchange and symbol, then fetched with four
 * workers. Same-symbol listings on different exchanges never share a quote.
 */
export async function fetchWorldStockQuotes(requests: WorldStockQuoteRequest[]): Promise<{ quotes: Record<string, WorldStockQuote>; partialFailure: boolean }> {
  const unique = new Map<string, WorldStockQuoteRequest>();
  for (const request of requests) {
    if (!request.canonicalSymbol) continue;
    const id = worldStockQuoteKey(request.exchangeCode, request.canonicalSymbol);
    if (!unique.has(id)) unique.set(id, request);
  }

  const quotes: Record<string, WorldStockQuote> = {};
  let partialFailure = false;

  const queue = [...unique.values()]; let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (cursor < queue.length) {
    const request = queue[cursor++];
    const id = worldStockQuoteKey(request.exchangeCode, request.canonicalSymbol);
    try {
      if (providerRegion(request.exchangeCode)) {
        quotes[id] = await providerStockQuote(request.exchangeCode, request.canonicalSymbol);
        if (quotes[id].price === null) partialFailure = true;
        continue;
      }
      const result = await getQuoteWithFallback(request.providerSymbol, request.exchangeCode, {
        symbol: request.canonicalSymbol,
        market: request.exchangeCode,
        assetType: request.assetType,
        currency: request.currency,
      });

      if (result.ok) {
        quotes[id] = {
          price: result.data.price,
          change: result.data.change,
          changePercent: result.data.changePercent,
          currency: result.data.currency ?? request.currency ?? null,
          quoteTimestamp: result.data.observation?.precision === 'unknown' ? null : observationIso(result.data.lastUpdated),
          delayed: result.data.delayType !== 'realtime',
          dataSource: result.data.providerName,
          status: 'available',
        };
      } else {
        partialFailure = true;
        quotes[id] = {
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
      quotes[id] = {
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
    }
  }));
  // Backward-compatible unscoped keys are safe only for unambiguous symbols.
  for (const request of queue) {
    if (queue.filter(row => row.canonicalSymbol === request.canonicalSymbol).length === 1) quotes[request.canonicalSymbol] = quotes[worldStockQuoteKey(request.exchangeCode, request.canonicalSymbol)];
  }

  return { quotes, partialFailure };
}
