'use client';

// Domain-scoped translator used by market-* components.
//
// Why: src/lib/translations/market.ts is 163 KB of keys consumed almost
// exclusively by market pages. We used to spread it into the global TR
// object, so every page that imported `useLanguage` pulled it in. Removing
// it from the global spread (in src/lib/translations.ts) keeps non-market
// pages slim; this hook restores market-key resolution for the few
// components that actually need it, without forcing 1085 call sites to
// change. The `t` returned has the same shape — it checks TR_MARKET first,
// then falls back to the global translator.

import { useCallback } from 'react';
import { useLang } from '@/components/LanguageProvider';
import { TR_MARKET } from '@/lib/translations/market';

type Entry = { ar: string; en: string; fr?: string };
const MARKET = TR_MARKET as Record<string, Entry>;

export function useMarketLanguage() {
  const ctx = useLang();
  const { t: baseT, lang } = ctx;

  const t = useCallback(
    (key: string): string => {
      const marketEntry = MARKET[key];
      if (marketEntry) {
        return marketEntry[lang] ?? marketEntry.en;
      }
      // Type-cast: the global translator's signature wants keyof typeof TR,
      // but TR is `Record<string, ...>` so this is effectively `string`.
      return baseT(key as Parameters<typeof baseT>[0]);
    },
    [baseT, lang],
  );

  return { ...ctx, t };
}
