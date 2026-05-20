'use client';

/**
 * SFM Language Hook (standalone - for pages without the Provider)
 * Reads/writes localStorage directly.
 */
import { useCallback, useEffect, useState } from 'react';
import type { Lang } from '@/lib/translations';
import { t as translate, TR } from '@/lib/translations';

const KEY = 'sfm_lang';

export function useLanguage() {
  const [lang, setLangState] = useState<Lang>('ar');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY) as Lang | null;
      if (stored === 'ar' || stored === 'en') setLangState(stored);
    } catch {}
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
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
    isFr: false,
  };
}
