'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { translateFromDictionary, type Lang, type TranslationDictionary } from '@/lib/translations/types';
import { trackEvent } from '@/lib/analytics';
import { deferUntilStreamSettled } from '@/lib/runtime/deferUntilStreamSettled';
import {
  LanguageContext,
  useLang,
  type LanguageContextValue,
} from '@/components/LanguageContext';

const STORAGE_KEY = 'sfm_lang';
const LANG_EVENT = 'sfm-language-change';
let lastKnownLang: Lang = 'ar';

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

export function LanguageProvider({
  children,
  translations,
}: {
  children: React.ReactNode;
  translations: TranslationDictionary;
}) {
  const [lang, setLangState] = useState<Lang>(() => lastKnownLang);
  const commitLang = useCallback((nextLang: Lang) => {
    lastKnownLang = nextLang;
    setLangState(nextLang);
  }, []);

  useEffect(() => {
    // Deferred (not a plain synchronous call): committing this correction
    // while the route segment is still streaming can force React to abandon
    // hydrating it, orphaning the server-streamed markup that arrives
    // afterwards alongside the client-rendered replacement. See
    // deferUntilStreamSettled's docstring for the full mechanism.
    const cancelInitialSync = deferUntilStreamSettled(() => {
      commitLang(readStoredLang());
    });

    const syncLang = (event?: Event) => {
      const customLang = event instanceof CustomEvent ? event.detail?.lang : undefined;
      commitLang(isLang(customLang) ? customLang : readStoredLang());
    };

    window.addEventListener(LANG_EVENT, syncLang as EventListener);
    window.addEventListener('storage', syncLang);
    return () => {
      cancelInitialSync();
      window.removeEventListener(LANG_EVENT, syncLang as EventListener);
      window.removeEventListener('storage', syncLang);
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

  const tFn = useCallback((key: string) => translateFromDictionary(translations, key, lang), [lang, translations]);

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
