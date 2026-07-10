'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useMarketSystemState } from '@/hooks/useMarketSystemState';

type MarketSystemContextValue = ReturnType<typeof useMarketSystemState>;

const MarketSystemContext = createContext<MarketSystemContextValue | null>(null);

/**
 * Mounted once per market-facing page tree (market-analysis, market-agent, sharia-stocks,
 * diagnostics). Children read the same polled/deduped snapshot via useMarketSystemContext()
 * instead of each independently inferring provider connectivity.
 */
export function MarketSystemStateProvider({ children }: { children: ReactNode }) {
  const value = useMarketSystemState();
  return <MarketSystemContext.Provider value={value}>{children}</MarketSystemContext.Provider>;
}

export function useMarketSystemContext() {
  const context = useContext(MarketSystemContext);
  if (!context) {
    throw new Error('useMarketSystemContext must be used within a MarketSystemStateProvider');
  }
  return context;
}
