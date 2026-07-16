'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { moduleFromPath, trackEvent } from '@/lib/analytics';

export function AnalyticsTracker() {
  const pathname = usePathname() || '/';
  const { lang } = useLanguage();
  const { loading, session } = useAuth();
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
        accessToken: session?.access_token ?? null,
      });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [lang, loading, pathname, session?.access_token]);

  return null;
}
