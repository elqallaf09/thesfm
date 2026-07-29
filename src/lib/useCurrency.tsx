'use client';

import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { commitWhenStreamSettled } from '@/lib/runtime/streamingHydration';
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
    let stored: string | undefined;
    try {
      const direct = localStorage.getItem('sfm_currency');
      const settings = JSON.parse(localStorage.getItem('sfm_settings') || '{}') as { currency?: string; finance?: { currency?: string } };
      stored = direct || settings?.currency || settings?.finance?.currency || undefined;
    } catch {}
    if (!stored || stored === DEFAULT_CURRENCY) return;
    const storedCurrency = stored;
    // The first-paint sync must not land while a route Suspense segment is
    // still dehydrated (see streamingHydration.ts), and stays a transition
    // afterwards.
    return commitWhenStreamSettled(() => {
      startTransition(() => setCurrencyState(storedCurrency));
    });
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
