import type { CurrencyLocale } from './currencies';
import { formatMoney } from './formatMoney';

export type MoneyParseStatus = 'valid' | 'missing' | 'invalid';

export type ParsedMoney =
  | { status: 'valid'; value: number; raw: unknown }
  | { status: 'missing'; value: null; raw: unknown }
  | { status: 'invalid'; value: null; raw: unknown };

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const EASTERN_ARABIC_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

function digitValue(digit: string) {
  const arabicIndex = ARABIC_DIGITS.indexOf(digit);
  if (arabicIndex >= 0) return String(arabicIndex);
  const easternIndex = EASTERN_ARABIC_DIGITS.indexOf(digit);
  if (easternIndex >= 0) return String(easternIndex);
  return digit;
}

export function normalizeNumberInput(value: unknown): string {
  return String(value)
    .trim()
    .replace(/[٠-٩۰-۹]/g, digitValue)
    .replace(/٫/g, '.')
    .replace(/٬/g, ',')
    .replace(/[^\d.,+-]/g, '');
}

export function parseMoneyValue(value: unknown): ParsedMoney {
  if (value === null || value === undefined) return { status: 'missing', value: null, raw: value };
  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? { status: 'valid', value, raw: value }
      : { status: 'invalid', value: null, raw: value };
  }

  const normalized = normalizeNumberInput(value);
  if (!normalized) return { status: 'missing', value: null, raw: value };

  const lastDot = normalized.lastIndexOf('.');
  const lastComma = normalized.lastIndexOf(',');
  const decimalSeparator = lastDot >= 0 || lastComma >= 0
    ? (lastDot > lastComma ? '.' : ',')
    : null;

  let numeric = normalized;
  if (decimalSeparator === ',') {
    numeric = numeric.replace(/\./g, '').replace(/,/g, '.');
  } else if (decimalSeparator === '.') {
    numeric = numeric.replace(/,/g, '');
  }

  const sign = numeric.startsWith('-') ? '-' : '';
  numeric = sign + numeric.replace(/[+-]/g, '');
  const parsed = Number(numeric);

  return Number.isFinite(parsed)
    ? { status: 'valid', value: parsed, raw: value }
    : { status: 'invalid', value: null, raw: value };
}

export function moneyNumber(value: unknown, fallback = 0) {
  const parsed = parseMoneyValue(value);
  return parsed.status === 'valid' ? parsed.value : fallback;
}

export function firstMoneyValue(row: Record<string, unknown> | null | undefined, keys: string[]): ParsedMoney {
  let invalid: ParsedMoney | null = null;
  for (const key of keys) {
    const raw = row?.[key];
    const parsed = parseMoneyValue(raw);
    if (parsed.status === 'valid') return parsed;
    if (parsed.status === 'invalid' && !invalid) invalid = parsed;
  }
  return invalid ?? { status: 'missing', value: null, raw: null };
}

export function formatDisplayMoney(
  value: unknown,
  currencyCode = 'KWD',
  language: CurrencyLocale = 'ar',
  labels?: Partial<Record<Exclude<MoneyParseStatus, 'valid'>, string>>,
) {
  const parsed = parseMoneyValue(value);
  if (parsed.status === 'missing') return labels?.missing ?? 'غير مدخل';
  if (parsed.status === 'invalid') return labels?.invalid ?? 'قيمة غير صالحة';
  return formatMoney(parsed.value, currencyCode, language);
}
