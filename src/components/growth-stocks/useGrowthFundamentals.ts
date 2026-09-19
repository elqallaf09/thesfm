'use client';
import { useEffect, useState } from 'react';
import type { GrowthFundamentals } from '@/lib/market/growthFundamentalsCore';

/** Independent, bounded batches keep prices/news usable while filings arrive. */
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
          const batch = list.slice(offset, offset + 6);
          const response = await fetch(`/api/growth-stocks/fundamentals?symbols=${encodeURIComponent(batch.join(','))}`, { signal: controller.signal });
          if (!response.ok) break;
          const payload = await response.json() as { ok?: boolean; items?: GrowthFundamentals[] };
          if (!payload.ok || !Array.isArray(payload.items)) break;
          const items = payload.items.filter(item => batch.includes(item.symbol));
          if (!controller.signal.aborted) setData(previous => ({ ...previous, ...Object.fromEntries(items.map(item => [item.symbol, item])) }));
          failedBatches = items.length && items.every(item => item.reason === 'source_unavailable') ? failedBatches + 1 : 0;
          if (failedBatches >= 2) break;
        }
      } catch { /* Prices remain usable during a filing-source outage. */ }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void run();
    return () => controller.abort();
  }, [key, refreshKey]);
  return { data, loading };
}
