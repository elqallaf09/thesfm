'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { moduleFromPath, trackEvent } from '@/lib/analytics';

const SECTION_BY_PATH: Array<{ prefix: string; section: string; legacyEvent?: Parameters<typeof trackEvent>[0] }> = [
  { prefix: '/expenses', section: 'expenses' },
  { prefix: '/income', section: 'income' },
  { prefix: '/invest', section: 'investments' },
  { prefix: '/goals', section: 'financial_goals' },
  { prefix: '/reports', section: 'reports', legacyEvent: 'open_reports' },
  { prefix: '/market-analysis', section: 'market_analysis', legacyEvent: 'open_market_analysis' },
  { prefix: '/financial-theories', section: 'financial_theories', legacyEvent: 'open_financial_theories' },
  { prefix: '/ebooks', section: 'ebooks' },
  { prefix: '/debts', section: 'debts' },
  { prefix: '/ai', section: 'financial_ai' },
  { prefix: '/charity', section: 'charity', legacyEvent: 'open_charity' },
  { prefix: '/zakat', section: 'zakat', legacyEvent: 'open_charity' },
  { prefix: '/projects', section: 'projects', legacyEvent: 'open_projects' },
];

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
      const section = SECTION_BY_PATH.find(item => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`));
      if (section) {
        const moduleName = moduleFromPath(pathname);
        void trackEvent('section_view', {
          page_path: pathname,
          page_title: document.title,
          module: moduleName,
          section_name: section.section,
          language: lang,
          metadata: { section: section.section },
        });
        if (section.legacyEvent) void trackEvent(section.legacyEvent, { page_path: pathname, module: moduleName, section_name: section.section, language: lang });
      }
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [lang, loading, pathname]);

  return null;
}
