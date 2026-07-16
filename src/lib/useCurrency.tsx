'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { DEFAULT_CURRENCY } from './currencies';

interface CurrencyContextValue {
  currency: string;
  setCurrency: (code: string) => void;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: DEFAULT_CURRENCY,
  setCurrency: () => {},
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState(DEFAULT_CURRENCY);

  useEffect(() => {
    try {
      const direct = localStorage.getItem('sfm_currency');
      if (direct) { setCurrencyState(direct); return; }
      const settings = JSON.parse(localStorage.getItem('sfm_settings') || '{}') as { currency?: string; finance?: { currency?: string } };
      if (settings?.currency) setCurrencyState(settings.currency);
      else if (settings?.finance?.currency) setCurrencyState(settings.finance.currency);
    } catch {}
  }, []);

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code);
    try { localStorage.setItem('sfm_currency', code); } catch {}
  }, []);

  const value = useMemo(() => ({ currency, setCurrency }), [currency, setCurrency]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
