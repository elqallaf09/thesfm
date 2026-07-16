'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Lang } from '@/lib/translations';
import { TR_AUTH } from '@/lib/translations/auth';
import { TR_COMMON } from '@/lib/translations/common';
import { TR_NAV } from '@/lib/translations/nav';
import { trackEvent } from '@/lib/analytics';
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

  useEffect(() => {
    setLangState(readStoredLang());
    const syncLang = (event?: Event) => {
      const customLang = event instanceof CustomEvent ? event.detail?.lang : undefined;
      setLangState(isLang(customLang) ? customLang : readStoredLang());
    };
    window.addEventListener(LANG_EVENT, syncLang as EventListener);
    window.addEventListener('storage', syncLang);
    return () => {
      window.removeEventListener(LANG_EVENT, syncLang as EventListener);
      window.removeEventListener('storage', syncLang);
    };
  }, []);

  const setLang = useCallback((nextLang: Lang) => {
    if (!isLang(nextLang)) return;
    setLangState(nextLang);
    void trackEvent('change_language', { language: nextLang, metadata: { language: nextLang } });
    try {
      localStorage.setItem(STORAGE_KEY, nextLang);
      window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: { lang: nextLang } }));
    } catch {}
  }, []);

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
