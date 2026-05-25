export type DateFormatLanguage = 'ar' | 'en' | 'fr';

export function dateLocale(language: DateFormatLanguage = 'ar') {
  if (language === 'fr') return 'fr-FR';
  if (language === 'en') return 'en-US';
  return 'ar-KW';
}

export function parseAppDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date : null;
}

export function formatDate(value: unknown, language: DateFormatLanguage = 'ar', options?: Intl.DateTimeFormatOptions) {
  const date = parseAppDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(dateLocale(language), options ?? {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatMonth(value: unknown, language: DateFormatLanguage = 'ar') {
  return formatDate(value, language, { year: 'numeric', month: 'long' });
}
