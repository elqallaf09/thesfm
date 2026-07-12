import type { Lang } from '@/lib/translations';

export const LEGACY_CHARITY_PREFIX = '\u062e\u064a\u0631\u064a\u0629';

export type CharityRecord = {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  month: string;
  note: string;
  created_at?: string | null;
};

export type LegacyCharityRow = {
  id: string;
  user_id: string;
  name: string;
  amount: number | string | null;
  created_at?: string | null;
};

const MONTH_NAMES: Record<Lang, readonly string[]> = {
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
};

export function currentYM(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function labelFromYM(value: string, lang: Lang): string {
  const [year, month] = value.split('-');
  const monthIndex = Number.parseInt(month, 10) - 1;
  return `${MONTH_NAMES[lang][monthIndex] ?? month} ${year}`;
}

export function buildMonthOptions(lang: Lang): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];
  const now = new Date();
  for (let index = 0; index < 12; index += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    options.push({ value, label: labelFromYM(value, lang) });
  }
  return options;
}

export function parseLegacyCharityRow(row: LegacyCharityRow, fallbackName: string): CharityRecord {
  const parts = String(row.name ?? '').split(':');
  const note = parts.slice(2).join(':').trim();
  return {
    id: row.id,
    user_id: row.user_id,
    name: note || fallbackName,
    amount: Number(row.amount) || 0,
    month: parts[1] || currentYM(),
    note,
    created_at: row.created_at,
  };
}

export function toFiniteNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isInCalendarYear(date: string | null | undefined, year: number): boolean {
  if (!date) return false;
  const parsed = new Date(date.length === 7 ? `${date}-01T00:00:00` : date);
  return !Number.isNaN(parsed.getTime()) && parsed.getFullYear() === year;
}
