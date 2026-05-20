'use client';

/**
 * SFM Language Hook (standalone - for pages without the Provider)
 * Reads/writes localStorage directly.
 */
import { useCallback, useEffect, useState } from 'react';
import type { Lang } from '@/lib/translations';
import { t as translate, TR } from '@/lib/translations';

const KEY = 'sfm_lang';
const LANG_EVENT = 'sfm-language-change';

function isLang(value: string | null): value is Lang {
  return value === 'ar' || value === 'en' || value === 'fr';
}

function readStoredLang(): Lang {
  if (typeof window === 'undefined') return 'ar';
  try {
    const stored = localStorage.getItem(KEY);
    return isLang(stored) ? stored : 'ar';
  } catch {
    return 'ar';
  }
}

export function useLanguage() {
  const [lang, setLangState] = useState<Lang>('ar');

  useEffect(() => {
    setLangState(readStoredLang());

    const sync = () => setLangState(readStoredLang());
    const onStorage = (event: StorageEvent) => {
      if (event.key === KEY) sync();
    };

    window.addEventListener(LANG_EVENT, sync);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener(LANG_EVENT, sync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
      window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: l }));
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
      document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
  }, [lang]);

  const t = useCallback((key: keyof typeof TR) => translate(key, lang), [lang]);
  const dir: 'rtl' | 'ltr' = lang === 'ar' ? 'rtl' : 'ltr';

  return {
    lang,
    setLang,
    t,
    dir,
    isAr: lang === 'ar',
    isEn: lang === 'en',
    isFr: lang === 'fr',
  };
}
