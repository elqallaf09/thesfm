'use client';

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Lang } from '@/lib/translations';
import { TR_AUTH } from '@/lib/translations/auth';
import { TR_COMMON } from '@/lib/translations/common';
import { TR_NAV } from '@/lib/translations/nav';
import { trackEvent } from '@/lib/analytics';
import { commitWhenStreamSettled } from '@/lib/runtime/streamingHydration';
import { LanguageContext } from '@/components/LanguageContext';

const STORAGE_KEY = 'sfm_lang';
const LANG_EVENT = 'sfm-language-change';
const PUBLIC_TRANSLATIONS = {
  ...TR_AUTH,
  ...TR_COMMON,
  ...TR_NAV,
};

function isLang(value: unknown): value is Lang {
  return value === 'ar' || value === 'en' || value === 'fr';
}

function readStoredLang(): Lang {
  if (typeof window === 'undefined') return 'ar';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isLang(stored) ? stored : 'ar';
  } catch {
    return 'ar';
  }
}

export function PublicLanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar');
  const pendingLangRef = useRef<Lang | null>(null);
  const cancelPendingCommitRef = useRef<(() => void) | null>(null);

  // Committing a locale while the server HTML is still streaming forces the
  // pending Suspense segments to client-render and orphans their late server
  // trees (duplicate workspace <main> elements). Every locale state commit
  // therefore waits for the stream to settle, then applies the latest value
  // at transition priority so already-arrived boundaries hydrate first.
  const commitLang = useCallback((nextLang: Lang) => {
    pendingLangRef.current = nextLang;
    cancelPendingCommitRef.current?.();
    cancelPendingCommitRef.current = commitWhenStreamSettled(() => {
      cancelPendingCommitRef.current = null;
      const settledLang = pendingLangRef.current;
      if (settledLang === null) return;
      startTransition(() => setLangState(settledLang));
    });
  }, []);

  useEffect(() => {
    commitLang(readStoredLang());
    const syncLang = (event?: Event) => {
      const customLang = event instanceof CustomEvent ? event.detail?.lang : undefined;
      commitLang(isLang(customLang) ? customLang : readStoredLang());
    };
    window.addEventListener(LANG_EVENT, syncLang as EventListener);
    window.addEventListener('storage', syncLang);
    return () => {
      window.removeEventListener(LANG_EVENT, syncLang as EventListener);
      window.removeEventListener('storage', syncLang);
      cancelPendingCommitRef.current?.();
      cancelPendingCommitRef.current = null;
    };
  }, [commitLang]);

  const setLang = useCallback((nextLang: Lang) => {
    if (!isLang(nextLang)) return;
    commitLang(nextLang);
    void trackEvent('change_language', { language: nextLang, metadata: { language: nextLang } });
    try {
      localStorage.setItem(STORAGE_KEY, nextLang);
      window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: { lang: nextLang } }));
    } catch {}
  }, [commitLang]);

  useEffect(() => {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    document.body.dir = dir;
    document.body.style.overflow = '';
    document.body.style.overflowX = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.inset = '';
    document.body.style.transform = '';
    document.documentElement.style.overflowX = '';
    document.body.classList.remove('sfm-mobile-lock');
    document.documentElement.dataset.sfmLang = lang;
    document.documentElement.dataset.sfmDir = dir;
    window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }, [lang]);

  const value = useMemo(() => ({
    lang,
    setLang,
    t: (key: string) => {
      const entry = PUBLIC_TRANSLATIONS[key as keyof typeof PUBLIC_TRANSLATIONS];
      return entry?.[lang] ?? entry?.en ?? entry?.ar ?? key;
    },
    dir: lang === 'ar' ? 'rtl' as const : 'ltr' as const,
    isAr: lang === 'ar',
    isEn: lang === 'en',
    isFr: lang === 'fr',
  }), [lang, setLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
