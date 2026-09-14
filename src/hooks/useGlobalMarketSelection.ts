'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_GLOBAL_MARKET_STRIPS,
  GLOBAL_MARKETS_PREFERENCE_KEY,
  normalizeSelectedMarketIds,
} from '@/lib/market/globalMarketPreferences';
import type { GlobalMarketStripId } from '@/lib/market/globalMarketStrips';
import { deferUntilStreamSettled } from '@/lib/runtime/deferUntilStreamSettled';

export function useGlobalMarketSelection() {
  const [selectedIds, setSelectedIdsState] = useState<GlobalMarketStripId[]>(DEFAULT_GLOBAL_MARKET_STRIPS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => deferUntilStreamSettled(() => {
    try {
      const stored = window.localStorage.getItem(GLOBAL_MARKETS_PREFERENCE_KEY);
      setSelectedIdsState(normalizeSelectedMarketIds(stored ? JSON.parse(stored) : null));
    } catch {
      setSelectedIdsState([...DEFAULT_GLOBAL_MARKET_STRIPS]);
    } finally {
      setHydrated(true);
    }
  }), []);

  const setSelectedIds = useCallback((ids: GlobalMarketStripId[]) => {
    const normalized = normalizeSelectedMarketIds(ids);
    setSelectedIdsState(normalized);
    try {
      window.localStorage.setItem(GLOBAL_MARKETS_PREFERENCE_KEY, JSON.stringify(normalized));
    } catch {
      // Restricted storage must not prevent selecting markets for this visit.
    }
  }, []);

  const restoreDefaults = useCallback(() => {
    setSelectedIds([...DEFAULT_GLOBAL_MARKET_STRIPS]);
  }, [setSelectedIds]);

  return { selectedIds, setSelectedIds, restoreDefaults, hydrated };
}
