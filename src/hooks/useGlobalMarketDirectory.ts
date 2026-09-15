'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import type { GlobalDirectoryFilters, GlobalDirectoryPage, GlobalDirectoryRow } from '@/lib/market/globalMarketDirectoryTypes';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';

const PAGE_SIZE = 12;
const pageCache = new Map<string, GlobalDirectoryPage>();

function paramsFor(filters: GlobalDirectoryFilters, offset: number, limit: number) {
  return new URLSearchParams({ q: filters.query.trim(), country: filters.country, exchange: filters.exchange, sector: filters.sector, assetType: filters.assetType, offset: String(offset), limit: String(limit) }).toString();
}

async function getPage(key: string, signal: AbortSignal) {
  const cached = pageCache.get(key);
  if (cached) return cached;
  const response = await fetch(`/api/market-directory?${key}`, { signal });
  const data = await response.json() as GlobalDirectoryPage;
  if (!response.ok || !data.success || !Array.isArray(data.items)) throw new Error('directory_unavailable');
  if (pageCache.size >= 30) pageCache.delete(pageCache.keys().next().value!);
  pageCache.set(key, data);
  return data;
}

export function useGlobalMarketDirectory(enabled: boolean, filters: GlobalDirectoryFilters) {
  const key = paramsFor(filters, 0, PAGE_SIZE);
  const [state, setState] = useState<{ key: string; page: GlobalDirectoryPage | null; loading: boolean; error: boolean }>({ key: '', page: null, loading: false, error: false });
  const [retry, setRetry] = useState(0);
  const [appending, setAppending] = useState(false);
  const [pending, startTransition] = useTransition();
  const request = useRef<AbortController | null>(null);
  const appendLock = useRef(false);
  const commitStarted = useRef(false);

  useEffect(() => {
    request.current?.abort();
    appendLock.current = false;
    commitStarted.current = false;
    setAppending(false);
    if (!enabled) return;
    const controller = new AbortController();
    request.current = controller;
    setState({ key, page: null, loading: true, error: false });
    // Debounce typing; the old request is cancelled before scheduling the next.
    const timer = setTimeout(() => {
      void getPage(key, controller.signal).then(page => {
        if (!controller.signal.aborted) setState({ key, page, loading: false, error: false });
      }).catch(() => {
        if (!controller.signal.aborted) setState({ key, page: null, loading: false, error: true });
      });
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); request.current?.abort(); };
  }, [enabled, key, retry]);

  const page = state.key === key ? state.page : null;
  async function loadMore(mobile: boolean) {
    if (!page || page.nextOffset === null || appendLock.current) return;
    appendLock.current = true;
    setAppending(true);
    performance.clearMarks('gm-explorer-append-start');
    performance.clearMarks('gm-explorer-append-end');
    performance.clearMeasures('gm-explorer-append');
    const controller = new AbortController();
    request.current = controller;
    try {
      const next = await getPage(paramsFor(filters, page.nextOffset, mobile ? 6 : PAGE_SIZE), controller.signal);
      if (controller.signal.aborted) return;
      const seen = new Set(page.items.map(item => item.id));
      performance.mark('gm-explorer-append-start');
      commitStarted.current = true;
      startTransition(() => setState({ key, page: { ...next, items: [...page.items, ...next.items.filter(item => !seen.has(item.id))] }, loading: false, error: false }));
    } catch {
      if (!controller.signal.aborted) {
        setState(current => ({ ...current, error: true }));
        appendLock.current = false;
        setAppending(false);
      }
    }
  }

  useEffect(() => {
    if (!appending || !commitStarted.current || pending) return;
    commitStarted.current = false;
    appendLock.current = false;
    setAppending(false);
    performance.mark('gm-explorer-append-end');
    performance.measure('gm-explorer-append', 'gm-explorer-append-start', 'gm-explorer-append-end');
  }, [appending, pending, page]);

  return { page, loading: enabled && (state.key !== key || state.loading), error: state.key === key && state.error, appending: appending || pending, loadMore, retry: () => { pageCache.delete(key); setRetry(value => value + 1); } };
}

export function useGlobalDirectoryPrices(rows: GlobalDirectoryRow[], existing: Record<string, TechStockPrice> | null) {
  const [prices, setPrices] = useState<Record<string, TechStockPrice>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const requested = rows.map(row => row.providerSymbol).filter(symbol => !prices[symbol] && !existing?.[symbol]).slice(0, 24).join(',');

  useEffect(() => {
    if (!requested) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    void fetch(`/api/market-directory/quotes?symbols=${encodeURIComponent(requested)}`, { signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !data.success || !data.prices) throw new Error('quotes_unavailable');
        if (!controller.signal.aborted) setPrices(current => ({ ...current, ...data.prices }));
      }).catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [requested, retry]);

  const retryPrices = useCallback(() => setRetry(value => value + 1), []);
  return { prices: { ...existing, ...prices }, loading, error, retry: retryPrices };
}
