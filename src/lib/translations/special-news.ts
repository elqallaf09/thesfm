import type { Lang } from '../translations';

type TranslationEntry = Partial<Record<Lang, string>> & { ar: string; en: string };

export const TR_SPECIAL_NEWS: Record<string, TranslationEntry> = {
  nav_federal_reserve_news: {
    ar: 'أخبار الفيدرالي الأمريكي',
    en: 'Federal Reserve News',
    fr: 'Actualités de la Réserve fédérale',
  },
  nav_asia_market_news: {
    ar: 'أخبار السوق الآسيوي',
    en: 'Asian Market News',
    fr: 'Actualités des marchés asiatiques',
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
  nav_metals_news: {
    ar: 'أخبار المعادن',
    en: 'Metals News',
    fr: 'Actualités des métaux',
  },
  nav_earnings_news: {
    ar: 'أخبار الأرباح والنتائج',
    en: 'Earnings & Results News',
    fr: 'Actualités des résultats',
  },
  nav_analyst_ratings_news: {
    ar: 'أخبار المحللين',
    en: 'Analyst Ratings News',
    fr: 'Actualités des analystes',
  },
  nav_mergers_acquisitions_news: {
    ar: 'أخبار الاندماجات والاستحواذات',
    en: 'Mergers & Acquisitions News',
    fr: 'Actualités fusions-acquisitions',
  },
  nav_unusual_moves_news: {
    ar: 'التحركات غير العادية',
    en: 'Unusual Market Moves',
    fr: 'Mouvements de marché inhabituels',
  },
};
