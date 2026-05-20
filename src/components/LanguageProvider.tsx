'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Lang } from '@/lib/translations';
import { t as translate, TR } from '@/lib/translations';
import { supabase } from '@/integrations/supabase/client';

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
    const browserLang = navigator.language || (navigator as Navigator & { userLanguage?: string }).userLanguage || '';
    if (browserLang.toLowerCase().startsWith('fr')) return 'fr';
    if (browserLang.toLowerCase().startsWith('ar')) return 'ar';
    return 'en';
  } catch {
    return 'ar';
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
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_lang')
        .eq('id', data.user.id)
        .maybeSingle();
      if (isLang(profile?.preferred_lang)) {
        localStorage.setItem(STORAGE_KEY, profile.preferred_lang);
        setLangState(profile.preferred_lang);
      }
    }).catch(() => {});

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
      window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: { lang: l } }));
    } catch {}
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      return supabase.from('profiles').update({ preferred_lang: l }).eq('id', data.user.id);
    }).catch(() => {});
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
