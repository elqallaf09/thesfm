'use client';
/**
 * Language Initializer Component
 * Updates the HTML dir attribute when language changes.
 * Must be inside LanguageProvider.
 */
import { useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';

export default function LanguageInitializer() {
  const { lang, dir } = useLanguage();

  useEffect(() => {
    // Update HTML attributes
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = dir;
    }
  }, [lang, dir]);

  return null;
}
