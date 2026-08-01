'use client';

import { LanguageProvider } from '@/components/LanguageProvider';
import { PERSONAL_FINANCE_TRANSLATIONS } from '@/lib/translations/bundles/personalFinance';

export function PersonalFinanceLanguageProvider({ children }: { children: React.ReactNode }) {
  return <LanguageProvider translations={PERSONAL_FINANCE_TRANSLATIONS}>{children}</LanguageProvider>;
}
