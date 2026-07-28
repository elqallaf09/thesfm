'use client';

import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Lang } from '@/lib/translations';
import { t as translate, TR } from '@/lib/translations';
import { trackEvent } from '@/lib/analytics';
import { commitWhenStreamSettled } from '@/lib/runtime/streamingHydration';
import {
  LanguageContext,
  useLang,
  type LanguageContextValue,
} from '@/components/LanguageContext';

const STORAGE_KEY = 'sfm_lang';
const LANG_EVENT = 'sfm-language-change';

function isLang(value: unknown): value is Lang {
  return value === 'ar' || value === 'en' || value === 'fr';
}

function readStoredLang(): Lang {
  if (typeof window === 'undefined') return 'ar';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLang(stored)) return stored;
    return 'ar';
  } catch {
    return 'ar';
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
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

  const setLang = useCallback((l: Lang) => {
    if (!isLang(l)) return;
    commitLang(l);
    void trackEvent('change_language', { language: l, metadata: { language: l } });
    try {
      localStorage.setItem(STORAGE_KEY, l);
      window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: { lang: l } }));
    } catch {}
  }, [commitLang]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
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
      window.requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });
    }
  }, [lang]);

  const tFn = useCallback((key: keyof typeof TR) => translate(key, lang), [lang]);

  const value = useMemo<LanguageContextValue>(() => ({
    lang,
    setLang,
    t: tFn,
    dir: lang === 'ar' ? 'rtl' : 'ltr',
    isAr: lang === 'ar',
    isEn: lang === 'en',
    isFr: lang === 'fr',
  }), [lang, setLang, tFn]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export { useLang };
