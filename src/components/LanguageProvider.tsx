'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Lang } from '@/lib/translations';
import { t as translate, TR } from '@/lib/translations';

const STORAGE_KEY = 'sfm_lang';
const LANG_EVENT = 'sfm-language-change';

function isLang(value: unknown): value is Lang {
  return value === 'ar' || value === 'en' || value === 'fr';
}

function readCookieLang(): Lang | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)sfm_lang=(ar|en|fr)/);
  return match ? (match[1] as Lang) : null;
}

function readStoredLang(): Lang {
  if (typeof window === 'undefined') return 'ar';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLang(stored)) return stored;
    return readCookieLang() ?? 'ar';
  } catch {
    return readCookieLang() ?? 'ar';
  }
}

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

  const setLang = useCallback((l: Lang) => {
    if (!isLang(l)) return;
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
      // Mirror to a cookie so the server can pick the right dir/lang on SSR
      document.cookie = `${STORAGE_KEY}=${l};path=/;max-age=31536000;samesite=lax`;
      window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: { lang: l } }));
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
      document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
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
    isFr: lang === 'fr',
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
