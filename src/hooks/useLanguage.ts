/**
 * SFM Global Language Hook
 * Persists language choice in localStorage across all pages.
 * Usage: const { lang, setLang, isAr, isFr, t } = useLanguage();
 */
import { useState, useEffect, useCallback } from 'react';

export type Lang = 'ar' | 'en' | 'fr';

const STORAGE_KEY = 'sfm_lang';

export function useLanguage(defaultLang: Lang = 'ar') {
  const [lang, setLangState] = useState<Lang>(defaultLang);

  // Hydrate from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored && ['ar', 'en', 'fr'].includes(stored)) {
      setLangState(stored);
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  /** Quick 3-way translation helper */
  const t = useCallback((ar: string, en: string, fr: string) => {
    if (lang === 'ar') return ar;
    if (lang === 'fr') return fr;
    return en;
  }, [lang]);

  return {
    lang,
    setLang,
    isAr: lang === 'ar',
    isEn: lang === 'en',
    isFr: lang === 'fr',
    dir: lang === 'ar' ? 'rtl' as const : 'ltr' as const,
    t,
  };
}
