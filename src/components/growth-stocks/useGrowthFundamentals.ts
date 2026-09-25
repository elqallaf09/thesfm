'use client';
import { useEffect, useState } from 'react';
import { emptyGrowthFundamentals, type GrowthFundamentals } from '@/lib/market/growthFundamentalsCore';

const cache = new Map<string, { value: GrowthFundamentals; expires: number }>();
const pending = new Map<string, Promise<GrowthFundamentals>>();
async function loadBatch(symbols: string[]) {
  const missing = symbols.filter(symbol => !pending.has(symbol) && (cache.get(symbol)?.expires ?? 0) <= Date.now());
  if (missing.length) {
    const request = fetch(`/api/growth-stocks/fundamentals?v=2&symbols=${encodeURIComponent(missing.join(','))}`, { signal: AbortSignal.timeout(45_000) })
      .then(async response => {
        if (!response.ok) throw new Error('filings_unavailable');
        const payload = await response.json() as { ok?: boolean; items?: GrowthFundamentals[] };
        if (!payload.ok || !Array.isArray(payload.items)) throw new Error('filings_unavailable');
        return payload.items;
      });
    for (const symbol of missing) {
      const task = request.then(items => items.find(item => item.symbol === symbol) ?? emptyGrowthFundamentals(symbol, 'source_unavailable'))
        .catch(() => emptyGrowthFundamentals(symbol, 'source_unavailable'))
        .then(value => {
          if (cache.size >= 250) cache.delete(cache.keys().next().value!);
          cache.set(symbol, { value, expires: Date.now() + (value.reason === 'source_unavailable' ? 60_000 : 300_000) });
          return value;
        }).finally(() => pending.delete(symbol));
      pending.set(symbol, task);
    }
  }
  return Promise.all(symbols.map(symbol => pending.get(symbol) ?? Promise.resolve(cache.get(symbol)!.value)));
}

/** Cards and the page share bounded requests, including while filters change. */
export function useGrowthFundamentals(symbols: string[], refreshKey: string | null) {
  const key = [...new Set(symbols)].slice(0, 200).join(',');
  const [data, setData] = useState<Record<string, GrowthFundamentals>>({});
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    const run = async () => {
      setLoading(true);
      const list = key.split(',');
      let failedBatches = 0;
      try {
        for (let offset = 0; offset < list.length && !controller.signal.aborted; offset += 6) {
          const items = await loadBatch(list.slice(offset, offset + 6));
          if (!controller.signal.aborted) setData(previous => ({ ...previous, ...Object.fromEntries(items.map(item => [item.symbol, item])) }));
          failedBatches = items.length && items.every(item => item.reason === 'source_unavailable') ? failedBatches + 1 : 0;
          if (failedBatches >= 2) break;
        }
      } finally {
        if (!controller.signal.aborted) {
          setData(previous => ({ ...Object.fromEntries(list.map(symbol => [symbol,
            previous[symbol] ?? emptyGrowthFundamentals(symbol, 'source_unavailable'),
          ])), ...previous }));
          setLoading(false);
        }
      }
    };
    void run();
    return () => controller.abort();
  }, [key, refreshKey]);
  return { data, loading };
}
