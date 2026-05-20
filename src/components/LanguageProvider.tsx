'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Lang } from './translations';
import { t as translate, TR } from './translations';

const STORAGE_KEY = 'sfm_lang';

interface LangCtx {
  lang:   Lang;
  setLang:(l: Lang) => void;
  t:      (key: keyof typeof TR) => string;
  dir:    'rtl' | 'ltr';
  isAr:   boolean;
  isEn:   boolean;
}

const Ctx = createContext<LangCtx>({
  lang: 'ar', setLang: () => {}, t: k => String(k),
  dir: 'rtl', isAr: true, isEn: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar');

  /* Hydrate from localStorage on mount */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored === 'ar' || stored === 'en') setLangState(stored);
    } catch {}
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
    /* Flip document direction instantly */
    if (typeof document !== 'undefined') {
      document.documentElement.dir  = l === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = l;
    }
  }, []);

  const tFn = useCallback((key: keyof typeof TR) => translate(key, lang), [lang]);

  return (
    <Ctx.Provider value={{ lang, setLang, t: tFn, dir: lang === 'ar' ? 'rtl' : 'ltr', isAr: lang === 'ar', isEn: lang === 'en' }}>
      {children}
    </Ctx.Provider>
  );
}

export function useLang() { return useContext(Ctx); }
