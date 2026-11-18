import type { TvLanguage } from '@/lib/markets-tv/types';

const copy = {
  ar: { partial: 'تغطية جزئية' },
  en: { partial: 'Partial coverage' },
  fr: { partial: 'Couverture partielle' },
} satisfies Record<TvLanguage, { partial: string }>;

export const stripCopy = (language: TvLanguage) => copy[language];
