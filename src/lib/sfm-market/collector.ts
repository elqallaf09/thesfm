import 'server-only';

import { SIGNAL_REFRESH_UNIVERSE } from '@/lib/market/signalService';
import { getSfmMarketQuote } from '@/lib/sfm-market/engine';
import { persistSfmMarketObservation } from '@/lib/sfm-market/store';

export const SFM_MARKET_COLLECTOR_DEFAULT_UNIVERSE = Array.from(new Set(
  SIGNAL_REFRESH_UNIVERSE.map(symbol => String(symbol ?? '').trim().toUpperCase()).filter(Boolean),
));

export type SfmMarketCollectionItem = {
  symbol: string;
  quoteAvailable: boolean;
  recorded: boolean;
  quality: string | null;
  upstreamProvider: string | null;
  observedAt: string | null;
  reason: string | null;
};

export type SfmMarketCollectionResult = {
  requested: number;
  quoteAvailable: number;
  recorded: number;
  skipped: number;
  failed: number;
  startedAt: string;
  completedAt: string;
  items: SfmMarketCollectionItem[];
};

function normalizeSymbols(symbols: string[]) {
  return Array.from(new Set(symbols.map(symbol => String(symbol ?? '').trim().toUpperCase()).filter(Boolean))).slice(0, 100);
}

export async function collectSfmMarketObservations(
  symbols: string[] = SFM_MARKET_COLLECTOR_DEFAULT_UNIVERSE,
  options: { forceFresh?: boolean; concurrency?: number } = {},
): Promise<SfmMarketCollectionResult> {
  const startedAt = new Date().toISOString();
  const universe = normalizeSymbols(symbols);
  const concurrency = Math.min(6, Math.max(1, Math.trunc(options.concurrency ?? 3)));
  const items: SfmMarketCollectionItem[] = [];

  for (let cursor = 0; cursor < universe.length; cursor += concurrency) {
    const batch = universe.slice(cursor, cursor + concurrency);
    const settled = await Promise.allSettled(batch.map(async symbol => {
      const quote = await getSfmMarketQuote(symbol, { forceFresh: options.forceFresh ?? true });
      if (!quote) {
        return {
          symbol,
          quoteAvailable: false,
          recorded: false,
          quality: null,
          upstreamProvider: null,
          observedAt: null,
          reason: 'market_data_unavailable',
        } satisfies SfmMarketCollectionItem;
      }
      const stored = await persistSfmMarketObservation(quote);
      return {
        symbol,
        quoteAvailable: true,
        recorded: stored.stored,
        quality: quote.quality.state,
        upstreamProvider: quote.provenance.upstreamProvider,
        observedAt: quote.provenance.observedAt,
        reason: stored.stored ? null : stored.reason,
      } satisfies SfmMarketCollectionItem;
    }));

    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        items.push(result.value);
      } else {
        items.push({
          symbol: batch[index] || 'UNKNOWN',
          quoteAvailable: false,
          recorded: false,
          quality: null,
          upstreamProvider: null,
          observedAt: null,
          reason: 'collector_exception',
        });
      }
    });
  }

  return {
    requested: universe.length,
    quoteAvailable: items.filter(item => item.quoteAvailable).length,
    recorded: items.filter(item => item.recorded).length,
    skipped: items.filter(item => item.quoteAvailable && !item.recorded).length,
    failed: items.filter(item => !item.quoteAvailable).length,
    startedAt,
    completedAt: new Date().toISOString(),
    items,
  };
}
