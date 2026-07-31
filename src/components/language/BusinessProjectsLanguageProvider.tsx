'use client';

import { LanguageProvider } from '@/components/LanguageProvider';
import { BUSINESS_PROJECTS_TRANSLATIONS } from '@/lib/translations/bundles/businessProjects';

export function BusinessProjectsLanguageProvider({ children }: { children: React.ReactNode }) {
  return <LanguageProvider translations={BUSINESS_PROJECTS_TRANSLATIONS}>{children}</LanguageProvider>;
}
