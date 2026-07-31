'use client';

import { LanguageProvider } from '@/components/LanguageProvider';
import { ADMINISTRATION_TRANSLATIONS } from '@/lib/translations/bundles/administration';

export function AdministrationLanguageProvider({ children }: { children: React.ReactNode }) {
  return <LanguageProvider translations={ADMINISTRATION_TRANSLATIONS}>{children}</LanguageProvider>;
}
