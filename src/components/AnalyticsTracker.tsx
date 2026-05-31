'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { moduleFromPath, trackEvent } from '@/lib/analytics';

export function AnalyticsTracker() {
  const pathname = usePathname() || '/';
  const { lang } = useLanguage();
  const { loading } = useAuth();
  const lastTracked = useRef('');

  useEffect(() => {
    if (loading) return;
    const key = `${pathname}:${lang}`;
    if (lastTracked.current === key) return;
    lastTracked.current = key;
    const timeout = window.setTimeout(() => {
      void trackEvent('page_view', {
        page_path: pathname,
        page_title: document.title,
        module: moduleFromPath(pathname),
        language: lang,
      });
      if (pathname.startsWith('/market-analysis')) void trackEvent('open_market_analysis', { page_path: pathname, module: 'market', language: lang });
      if (pathname.startsWith('/financial-theories')) void trackEvent('open_financial_theories', { page_path: pathname, module: 'financial_theories', language: lang });
      if (pathname.startsWith('/reports')) void trackEvent('open_reports', { page_path: pathname, module: 'reports', language: lang });
      if (pathname.startsWith('/charity') || pathname.startsWith('/zakat')) void trackEvent('open_charity', { page_path: pathname, module: 'charity', language: lang });
      if (pathname.startsWith('/projects')) void trackEvent('open_projects', { page_path: pathname, module: 'projects', language: lang });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [lang, loading, pathname]);

  return null;
}
