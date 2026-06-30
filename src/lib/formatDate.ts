import { formatDate as formatLocalizedDate, parseAppDate } from './locale';

export type DateFormatLanguage = 'ar' | 'en' | 'fr';

export function dateLocale(language: DateFormatLanguage = 'ar') {
  if (language === 'fr') return 'fr-FR';
  if (language === 'en') return 'en-US';
  return 'ar-KW-u-nu-latn';
}

export function formatDate(value: unknown, language: DateFormatLanguage = 'ar', options?: Intl.DateTimeFormatOptions) {
  return formatLocalizedDate(value, language, options);
}

export function formatMonth(value: unknown, language: DateFormatLanguage = 'ar') {
  return formatDate(value, language, { year: 'numeric', month: 'long' });
}
