'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Lang } from '@/lib/translations';
import { t as translate, TR } from '@/lib/translations';

const STORAGE_KEY = 'sfm_lang';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof TR) => string;
  dir: 'rtl' | 'ltr';
  isAr: boolean;
  isEn: boolean;
  isFr: boolean;
}

const Ctx = createContext<LangCtx>({
  lang: 'ar',
  setLang: () => {},
  t: k => String(k),
  dir: 'rtl',
  isAr: true,
  isEn: false,
  isFr: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored === 'ar' || stored === 'en') setLangState(stored);
    } catch {}
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const tFn = useCallback((key: keyof typeof TR) => translate(key, lang), [lang]);

  const value = useMemo<LangCtx>(() => ({
    lang,
    setLang,
    t: tFn,
    dir: lang === 'ar' ? 'rtl' : 'ltr',
    isAr: lang === 'ar',
    isEn: lang === 'en',
    isFr: false,
  }), [lang, setLang, tFn]);

  return (
    <Ctx.Provider value={value}>
      {children}
    </Ctx.Provider>
  );
}

export function useLang() {
  return useContext(Ctx);
}
