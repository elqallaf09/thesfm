import type { Lang } from '../translations';

type TranslationEntry = Partial<Record<Lang, string>> & { ar: string; en: string };

export const TR_SPECIAL_NEWS: Record<string, TranslationEntry> = {
  nav_federal_reserve_news: {
    ar: 'أخبار الفيدرالي الأمريكي',
    en: 'Federal Reserve News',
    fr: 'Actualités de la Réserve fédérale',
  },
  nav_healthcare_stocks_news: {
    ar: 'أخبار الأسهم الطبية',
    en: 'Healthcare Stocks News',
    fr: 'Actualités des actions santé',
  },
  nav_new_stocks_news: {
    ar: 'أخبار الأسهم الجديدة',
    en: 'New Stocks News',
    fr: 'Actualités des nouvelles actions',
  },
  nav_stocks_under_one: {
    ar: 'أخبار أسهم أقل من 1$',
    en: 'Stocks Under $1 News',
    fr: 'Actualités des actions sous 1 $',
  },
};
