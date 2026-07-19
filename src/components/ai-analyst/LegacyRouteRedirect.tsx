'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/hooks/useLanguage';
import { mapLegacyMarketAgentRoute, mapLegacyMarketAnalysisRoute } from '@/lib/ai-analyst/legacyRoutes';

type RedirectKind = 'market-analysis' | 'market-agent';

const COPY = {
  ar: 'جارٍ فتح إس إف إم المحلل الذكي…',
  en: 'Opening SFM Smart Analyst…',
  fr: 'Ouverture de SFM Smart Analyst…',
} as const;

export function LegacyRouteRedirect({ kind }: { kind: RedirectKind }) {
  const router = useRouter();
  const { dir, lang } = useLanguage();

  useEffect(() => {
    const destination = kind === 'market-analysis'
      ? mapLegacyMarketAnalysisRoute({ search: window.location.search, hash: window.location.hash })
      : mapLegacyMarketAgentRoute({ search: window.location.search });
    router.replace(destination);
  }, [kind, router]);

  const locale = lang === 'en' || lang === 'fr' ? lang : 'ar';
  return (
    <main dir={dir} role="status" aria-live="polite" style={{ minHeight: '12rem', display: 'grid', placeItems: 'center' }}>
      <span>{COPY[locale]}</span>
    </main>
  );
}
