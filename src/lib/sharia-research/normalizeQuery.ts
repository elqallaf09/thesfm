import type { NormalizedQuery } from './types';

const ARABIC_COMPANY_ALIASES: Record<string, string> = {
  'انفيديا': 'nvidia',
  'إنفيديا': 'nvidia',
  'نفيديا': 'nvidia',
  'ابل': 'apple',
  'آبل': 'apple',
  'مايكروسوفت': 'microsoft',
  'أمازون': 'amazon',
  'امازون': 'amazon',
  'ألفابت': 'alphabet',
  'الفابت': 'alphabet',
  'غوغل': 'google',
  'جوجل': 'google',
  'ميتا': 'meta',
  'تسلا': 'tesla',
};

const ARABIC_DIACRITICS = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g;
const ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

export function normalizeArabic(value: string) {
  return value
    .replace(ARABIC_DIACRITICS, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه');
}

export function normalizeResearchText(value: unknown) {
  return normalizeArabic(String(value ?? ''))
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.:-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveArabicAlias(original: string, normalized: string) {
  const direct = ARABIC_COMPANY_ALIASES[original.trim()];
  if (direct) return direct;
  const normalizedAlias = Object.entries(ARABIC_COMPANY_ALIASES)
    .find(([alias]) => normalizeResearchText(alias) === normalized);
  return normalizedAlias?.[1] ?? null;
}

function parseExchangeQualifiedSymbol(value: string) {
  const compact = value.trim().toUpperCase().replace(/\s+/g, '');
  const colon = compact.match(/^([A-Z0-9._-]{1,15}):([A-Z0-9.-]{1,20})$/);
  if (colon) return { exchangeHint: colon[1], symbol: colon[2] };
  const suffix = compact.match(/^([A-Z0-9-]{1,15})\.([A-Z]{1,4})$/);
  if (suffix) return { exchangeHint: suffix[2], symbol: compact };
  return { exchangeHint: null, symbol: compact };
}

export function normalizeQuery(value: unknown): NormalizedQuery {
  const original = String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 160);
  const normalized = normalizeResearchText(original);
  const compact = normalized.replace(/[\s.:-]+/g, '');
  const upperCompact = original.toUpperCase().replace(/[\s-]+/g, '');
  const possibleIsin = ISIN_PATTERN.test(upperCompact) ? upperCompact : null;
  const qualified = parseExchangeQualifiedSymbol(original);
  const possibleTicker = !possibleIsin && /^[A-Z0-9.^=-]{1,20}$/.test(qualified.symbol)
    ? qualified.symbol
    : null;

  return {
    original,
    normalized,
    compact,
    latinAlias: resolveArabicAlias(original, normalized),
    possibleTicker,
    possibleIsin,
    exchangeHint: qualified.exchangeHint,
  };
}

export function isValidIsin(value: string) {
  if (!ISIN_PATTERN.test(value)) return false;
  const expanded = value
    .split('')
    .map(character => /[A-Z]/.test(character) ? String(character.charCodeAt(0) - 55) : character)
    .join('');
  let sum = 0;
  let doubleDigit = false;
  for (let index = expanded.length - 1; index >= 0; index -= 1) {
    let digit = Number(expanded[index]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }
  return sum % 10 === 0;
}
