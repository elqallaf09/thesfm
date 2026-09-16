import 'server-only';

import { getSfmMarketQuote, type SfmMarketRequest } from '@/lib/sfm-market/engine';
import {
  persistSfmMarketObservation,
  type SfmDistributionScope,
} from '@/lib/sfm-market/observationStore';

const DEFAULT_CONCURRENCY = 4;
const MAX_BATCH_SIZE = 100;

export type SfmMarketIngestionItem = {
  symbol: string;
  status: 'stored' | 'unavailable' | 'skipped' | 'failed';
  fingerprint: string | null;
  reason: string | null;
};

export type SfmMarketIngestionResult = {
  requested: number;
  stored: number;
  unavailable: number;
  skipped: number;
  failed: number;
  items: SfmMarketIngestionItem[];
};

function normalizedSymbols(symbols: string[]) {
  return Array.from(new Set(symbols
    .map(symbol => String(symbol ?? '').trim().toUpperCase())
    .filter(Boolean)))
    .slice(0, MAX_BATCH_SIZE);
}

async function mapBounded<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>) {
  const output = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      output[index] = await mapper(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), items.length) }, () => worker()));
  return output;
}

/**
 * Pull normalized observations through the SFM contract and persist them in the
 * canonical store. Distribution remains internal-only unless the caller has
 * independently verified redistribution rights and passes external_allowed.
 *
 * This service does not schedule itself and does not accept browser input. A
 * cron/worker may call it later after the source licence and symbol universe
 * for that collector are configured.
 */
export async function ingestSfmMarketSymbols(options: {
  symbols: string[];
  request?: SfmMarketRequest;
  concurrency?: number;
  persistenceEnabled?: boolean;
  distributionScope?: SfmDistributionScope;
}): Promise<SfmMarketIngestionResult> {
  const symbols = normalizedSymbols(options.symbols);
  if (!symbols.length) {
    return { requested: 0, stored: 0, unavailable: 0, skipped: 0, failed: 0, items: [] };
  }

  const items = await mapBounded(symbols, options.concurrency ?? DEFAULT_CONCURRENCY, async symbol => {
    try {
      const quote = await getSfmMarketQuote(symbol, { ...options.request, forceFresh: true });
      if (!quote || quote.quality.state === 'unavailable') {
        return { symbol, status: 'unavailable', fingerprint: null, reason: 'sfm_quote_unavailable' } satisfies SfmMarketIngestionItem;
      }

      const persisted = await persistSfmMarketObservation(quote, {
        enabled: options.persistenceEnabled,
        distributionScope: options.distributionScope ?? 'internal_only',
      });
      if (!persisted.ok) {
        return { symbol, status: 'failed', fingerprint: persisted.fingerprint, reason: persisted.reason } satisfies SfmMarketIngestionItem;
      }
      if (!persisted.stored) {
        return { symbol, status: 'skipped', fingerprint: persisted.fingerprint, reason: persisted.reason } satisfies SfmMarketIngestionItem;
      }
      return { symbol, status: 'stored', fingerprint: persisted.fingerprint, reason: null } satisfies SfmMarketIngestionItem;
    } catch {
      return { symbol, status: 'failed', fingerprint: null, reason: 'ingestion_exception' } satisfies SfmMarketIngestionItem;
    }
  });

  return {
    requested: items.length,
    stored: items.filter(item => item.status === 'stored').length,
    unavailable: items.filter(item => item.status === 'unavailable').length,
    skipped: items.filter(item => item.status === 'skipped').length,
    failed: items.filter(item => item.status === 'failed').length,
    items,
  };
}
