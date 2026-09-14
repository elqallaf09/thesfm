import type { FinancialValue, RatioResult, ShariaMethodology } from './types';
import { compatibleFinancialValues, isoDay, validFinancialValue, ratioPasses } from './evidenceValidation';

export function isFinancialDataStale(periodEnd: string | null, freshnessMonths: number, now = new Date()) {
  if (!isoDay(periodEnd) || !Number.isFinite(freshnessMonths) || freshnessMonths <= 0) return true;
  const date = new Date(`${periodEnd}T00:00:00Z`);
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - freshnessMonths, now.getUTCDate()));
  return date > now || date < cutoff;
}

/** Each ratio is derived from one compatible filing context, never stitched across currencies or reports. */
export function calculateFinancialRatios(values: FinancialValue[], methodology: ShariaMethodology, now = new Date()) {
  return methodology.financialRatioRules.map((rule): RatioResult => {
    // Choose the newest reported denominator BEFORE validation. Invalid current data must
    // not silently fall back to an older passing balance sheet.
    const denominator = values.filter(value => value.normalizedField === rule.denominatorField)
      .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd) || String(b.filedAt).localeCompare(String(a.filedAt))
        || String(a.periodStart).localeCompare(String(b.periodStart)))[0] ?? null;
    const inputs = rule.numeratorFields.map(field => denominator ? values.filter(value => value.normalizedField === field
      && compatibleFinancialValues(value, denominator)).sort((a, b) => a.sourceTier - b.sourceTier)[0] : undefined);
    const present = inputs.filter((value): value is FinancialValue => Boolean(value));
    const result: RatioResult = {
      ruleId: rule.id, name: rule.name, nameAr: rule.nameAr, nameFr: rule.nameFr,
      numerator: null, denominator: denominator?.value ?? null, value: null,
      threshold: rule.threshold, operator: rule.operator,
      formula: `(${rule.numeratorFields.join(' + ')}) / ${rule.denominatorField}`,
      status: 'unavailable', reportingPeriod: denominator?.periodEnd ?? null,
      currency: denominator?.currency ?? null, inputs: [...present, ...(denominator ? [denominator] : [])], warning: null,
    };
    if (!denominator || !validFinancialValue(denominator, now) || denominator.value <= 0 || denominator.validation?.bound !== 'exact'
      || isFinancialDataStale(denominator.periodEnd, methodology.freshnessMonths, now)) {
      return { ...result, warning: 'Current, positive, source-verified denominator is missing, stale or invalid.' };
    }
    const invalid = present.filter(value => !validFinancialValue(value, now));
    const missing = rule.numeratorFields.filter((_, index) => !inputs[index]);
    if (invalid.length) return { ...result, warning: `Invalid/unverified numerator: ${invalid.map(value => value.normalizedField).join(', ')}.` };
    if (!present.length) return { ...result, warning: `Missing compatible field(s): ${missing.join(', ')}. No zero value was assumed.` };
    const numerator = present.reduce((sum, value) => sum + value.value, 0);
    const ratio = numerator / denominator.value;
    const passes = ratioPasses(present.map(value => value.value), denominator.value, rule.threshold, rule.operator);
    const lower = present.every(value => ['exact', 'lower'].includes(value.validation!.bound));
    const upper = !missing.length && present.every(value => ['exact', 'upper'].includes(value.validation!.bound));
    const exact = !missing.length && present.every(value => value.validation!.bound === 'exact');
    // A known lower bound can prove failure even while other non-negative components
    // are unavailable. It can never prove a pass; an upper bound works conversely.
    const status = exact ? (passes ? 'pass' : 'fail') : !passes && lower ? 'fail' : passes && upper ? 'pass' : 'unavailable';
    return {
      ...result, numerator, value: ratio, status,
      formula: `(${present.map(value => `${value.originalField} = ${value.value}`).join(' + ')}${missing.length ? ' + unknown components' : ''}) / (${denominator.originalField} = ${denominator.value})`,
      warning: exact ? null : status === 'fail' ? 'The documented lower bound already breaches the rule. Missing amounts were not assumed zero.'
        : status === 'pass' ? 'The documented upper bound is below the rule; this is not an exact ratio.'
          : `Incomplete numerator or uncertain instrument composition${missing.length ? `: ${missing.join(', ')}` : ''}; no definitive pass or fail.`,
    };
  });
}
