'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/hooks/useLanguage';
import {
  mapLegacyAiAnalystSectionRoute,
  mapLegacyMarketAgentRoute,
  mapLegacyMarketAnalysisRoute,
  mapLegacySymbolDetailsRoute,
} from '@/lib/ai-analyst/legacyRoutes';

type RedirectKind = 'alerts' | 'market-analysis' | 'market-agent' | 'symbol-details' | 'watchlist';

const COPY = {
  ar: 'جارٍ فتح إس إف إم المحلل الذكي…',
  en: 'Opening SFM AI Analyst…',
  fr: 'Ouverture d’Analyste IA SFM…',
} as const;

export function LegacyRouteRedirect({ kind, symbol }: { kind: RedirectKind; symbol?: string }) {
  const router = useRouter();
  const { dir, lang } = useLanguage();

  useEffect(() => {
    const destination = kind === 'market-analysis'
      ? mapLegacyMarketAnalysisRoute({ search: window.location.search, hash: window.location.hash })
      : kind === 'market-agent'
        ? mapLegacyMarketAgentRoute({ search: window.location.search, hash: window.location.hash })
        : kind === 'watchlist' || kind === 'alerts'
          ? mapLegacyAiAnalystSectionRoute(kind, { search: window.location.search, hash: window.location.hash })
        : mapLegacySymbolDetailsRoute(symbol ?? '', { search: window.location.search, hash: window.location.hash });
    router.replace(destination);
  }, [kind, router, symbol]);

  const locale = lang === 'en' || lang === 'fr' ? lang : 'ar';
  return (
    <main dir={dir} role="status" aria-live="polite" style={{ minHeight: '12rem', display: 'grid', placeItems: 'center' }}>
      <span>{COPY[locale]}</span>
    </main>
  );
}
