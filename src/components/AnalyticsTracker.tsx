'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/hooks/useLanguage';
import { moduleFromPath, trackEvent } from '@/lib/analytics';

export function AnalyticsTracker() {
  const pathname = usePathname() || '/';
  const { lang } = useLanguage();
  const lastTracked = useRef('');

  useEffect(() => {
    const key = `${pathname}:${lang}`;
    if (lastTracked.current === key) return;
    lastTracked.current = key;
    const timeout = window.setTimeout(() => {
      void trackEvent('page_view', {
        page_path: pathname,
        module: moduleFromPath(pathname),
        language: lang,
      });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [lang, pathname]);

  return null;
}
