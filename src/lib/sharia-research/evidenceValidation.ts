import type { FinancialValue } from './types';

export const EVIDENCE_VERSION = 'sfm-evidence-v2';
export const INCOME_FIELDS = new Set(['total_income', 'interest_income', 'prohibited_revenue']);

/** Zero is valid only when it was explicitly reported. Never coerce absent evidence. */
export function reportedNumber(value: unknown): number | null {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'raw' in value) {
    return reportedNumber((value as { raw: unknown }).raw);
  }
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function isoDay(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? value : null;
}

export function currentDay(value: unknown, now = new Date()): string | null {
  const date = isoDay(value);
  return date && date <= now.toISOString().slice(0, 10) ? date : null;
}

export function validFinancialValue(value: FinancialValue, now = new Date()) {
  if (value.validation?.version !== EVIDENCE_VERSION || value.validation.bound === 'unverified') return false;
  if (reportedNumber(value.value) === null || typeof value.value !== 'number') return false;
  if (!/^[A-Z]{3}$/.test(value.currency) || value.unit !== value.currency) return false;
  const evidenceDate = value.filedAt ?? (value.sourceDateKind === 'issuer_report_signature' ? value.reportedAt : null);
  if (!currentDay(value.periodEnd, now) || !currentDay(evidenceDate, now) || evidenceDate! < value.periodEnd) return false;
  if (![1, 2].includes(value.sourceTier) || !value.documentId || !value.sourceUrl.startsWith('https://')) return false;
  try { if (new URL(value.sourceUrl).protocol !== 'https:') return false; } catch { return false; }
  if (INCOME_FIELDS.has(value.normalizedField)) {
    const start = isoDay(value.periodStart);
    if (!start || start >= value.periodEnd) return false;
  } else if (value.periodStart) return false;
  return true;
}

export function compatibleFinancialValues(left: FinancialValue, right: FinancialValue) {
  try { return left.periodEnd === right.periodEnd
    && (left.periodStart ?? null) === (right.periodStart ?? null)
    && left.currency === right.currency && left.unit === right.unit
    && (left.accessionNumber && right.accessionNumber
      ? left.accessionNumber === right.accessionNumber && new URL(left.sourceUrl).hostname === new URL(right.sourceUrl).hostname
      : left.documentId === right.documentId);
  } catch { return false; }
}

export function missingFinancialFields(values: FinancialValue[], now = new Date()) {
  const fields = ['total_assets', 'interest_bearing_debt', 'cash_and_equivalents', 'interest_bearing_securities', 'accounts_receivable', 'total_income', 'interest_income', 'prohibited_revenue'] as const;
  return fields.filter(field => !values.some(value => value.normalizedField === field && validFinancialValue(value, now) && value.validation?.bound === 'exact'));
}

/** Exact decimal cross multiplication, avoiding 33.333 / 100 floating-point drift. */
function decimalFraction(value: number) {
  const [mantissa, exponent = '0'] = String(value).toLowerCase().split('e');
  const parts = mantissa.split('.');
  const scale = (parts[1]?.length ?? 0) - Number(exponent);
  const digits = BigInt(parts.join(''));
  return scale >= 0 ? { n: digits, d: BigInt(10) ** BigInt(scale) }
    : { n: digits * BigInt(10) ** BigInt(-scale), d: BigInt(1) };
}

export function ratioPasses(numerators: number[], denominator: number, threshold: number, operator: '<' | '<=') {
  const sum = numerators.map(decimalFraction).reduce((left, right) => ({ n: left.n * right.d + right.n * left.d, d: left.d * right.d }), { n: BigInt(0), d: BigInt(1) });
  const den = decimalFraction(denominator);
  const cap = decimalFraction(threshold);
  const left = sum.n * den.d * cap.d;
  const right = sum.d * den.n * cap.n;
  return operator === '<' ? left < right : left <= right;
}

export function financialFieldCoverage(values: FinancialValue[], period: string | null, now = new Date()) {
  const fields = ['total_assets', 'interest_bearing_debt', 'cash_and_equivalents', 'interest_bearing_securities', 'accounts_receivable', 'total_income', 'interest_income', 'prohibited_revenue'] as const;
  return fields.map(field => {
    const found = values.filter(value => value.normalizedField === field);
    const current = found.filter(value => !period || value.periodEnd === period);
    const valid = current.filter(value => validFinancialValue(value, now));
    const state: import('./types').FieldCoverage['state'] = !found.length ? 'missing'
      : !current.length ? 'outdated_period' : !valid.length ? 'invalid'
        : valid.some(value => value.validation?.bound === 'exact') ? 'exact' : 'bounded';
    return { field, state, reportedValues: found.length, financialPeriod: period };
  });
}
