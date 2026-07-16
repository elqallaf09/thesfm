'use client';

import { createContext, useContext } from 'react';
import type { Lang } from '@/lib/translations';

export interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
  isAr: boolean;
  isEn: boolean;
  isFr: boolean;
}

export const LanguageContext = createContext<LanguageContextValue>({
  lang: 'ar',
  setLang: () => {},
  t: key => key,
  dir: 'rtl',
  isAr: true,
  isEn: false,
  isFr: false,
});

export function useLang() {
  return useContext(LanguageContext);
}
