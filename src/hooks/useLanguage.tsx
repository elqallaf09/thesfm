'use client';
/**
 * SFM Language Hook (standalone — for pages without the Provider)
 * Reads/writes localStorage directly.
 */
import { useState, useEffect, useCallback } from 'react';
import type { Lang } from '@/lib/translations';
import { t as translate, TR } from '@/lib/translations';

const KEY = 'sfm_lang';

export function useLanguage() {
  const [lang, setLangState] = useState<Lang>('ar');

  useEffect(() => {
    try {
      const s = localStorage.getItem(KEY) as Lang | null;
      if (s === 'ar' || s === 'en') setLangState(s);
    } catch {}
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch {}
    if (typeof document !== 'undefined') {
      document.documentElement.dir  = l === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = l;
    }
  }, []);

  const t = useCallback((key: keyof typeof TR) => translate(key, lang), [lang]);

  return { lang, setLang, t, dir: lang === 'ar' ? 'rtl' : 'ltr' as const, isAr: lang === 'ar', isEn: lang === 'en' };
}
