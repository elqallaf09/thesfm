import type { FinancialValue, RatioResult, ShariaMethodology } from './types';
import { compatibleFinancialValues, isoDay, ratioPasses, validFinancialValue } from './evidenceValidation';

export function isFinancialDataStale(periodEnd: string | null, freshnessMonths: number, now = new Date()) {
  if (!isoDay(periodEnd) || !Number.isFinite(freshnessMonths) || freshnessMonths <= 0) return true;
  const date = new Date(`${periodEnd}T00:00:00Z`);
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - freshnessMonths, now.getUTCDate()));
  return date > now || date < cutoff;
}

/** Use the strongest compatible lower/upper evidence, retaining uncertainty.
 * Two different valid lower bounds are not conflicting exact measurements.
 */
export function calculateFinancialRatios(values: FinancialValue[], methodology: ShariaMethodology, now = new Date()) {
  return methodology.financialRatioRules.map((rule): RatioResult => {
    const denominator = values.filter(value => value.normalizedField === rule.denominatorField)
      .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd) || String(b.filedAt).localeCompare(String(a.filedAt))
        || String(a.periodStart).localeCompare(String(b.periodStart)))[0] ?? null;
    const groups = rule.numeratorFields.map(field => denominator ? values.filter(value => value.normalizedField === field
      && compatibleFinancialValues(value, denominator)) : []);
    const all = groups.flat();
    const result: RatioResult = {
      ruleId: rule.id, name: rule.name, nameAr: rule.nameAr, nameFr: rule.nameFr,
      numerator: null, denominator: denominator?.value ?? null, value: null,
      threshold: rule.threshold, operator: rule.operator,
      formula: `(${rule.numeratorFields.join(' + ')}) / ${rule.denominatorField}`,
      status: 'unavailable', reportingPeriod: denominator?.periodEnd ?? null,
      currency: denominator?.currency ?? null, inputs: [...all, ...(denominator ? [denominator] : [])], warning: null,
    };
    if (!denominator || !validFinancialValue(denominator, now) || denominator.value <= 0 || denominator.validation?.bound !== 'exact'
      || isFinancialDataStale(denominator.periodEnd, methodology.freshnessMonths, now)) {
      return { ...result, warning: 'Current, positive, source-verified denominator is missing, stale or invalid.' };
    }
    if (all.some(value => !validFinancialValue(value, now))) return { ...result, warning: 'Invalid/unverified numerator. No compatible invalid value was discarded to obtain a pass.' };
    const lower = groups.map(group => group.filter(value => ['exact', 'lower'].includes(value.validation!.bound)).sort((a, b) => b.value - a.value)[0]);
    const upper = groups.map(group => group.filter(value => ['exact', 'upper'].includes(value.validation!.bound)).sort((a, b) => a.value - b.value)[0]);
    if (lower.some((value, index) => value && upper[index] && value.value > upper[index]!.value)) {
      return { ...result, warning: 'Conflicting compatible bounds: a lower value exceeds an upper value.' };
    }
    const lowerInputs = lower.filter((value): value is FinancialValue => Boolean(value));
    const upperInputs = upper.filter((value): value is FinancialValue => Boolean(value));
    const fails = lowerInputs.length > 0 && !ratioPasses(lowerInputs.map(value => value.value), denominator.value, rule.threshold, rule.operator);
    const passes = upperInputs.length === rule.numeratorFields.length && ratioPasses(upperInputs.map(value => value.value), denominator.value, rule.threshold, rule.operator);
    const chosen = fails ? lowerInputs : passes ? upperInputs : lowerInputs.length ? lowerInputs : upperInputs;
    const missing = rule.numeratorFields.filter(field => !chosen.some(value => value.normalizedField === field));
    if (!chosen.length) return { ...result, warning: `Missing compatible field(s): ${rule.numeratorFields.join(', ')}. No zero value was assumed.` };
    const numerator = chosen.reduce((sum, value) => sum + value.value, 0);
    const exact = !missing.length && chosen.every(value => value.validation!.bound === 'exact');
    const status = fails ? 'fail' : passes ? 'pass' : 'unavailable';
    return { ...result, numerator, value: numerator / denominator.value, status,
      inputs: [...chosen, denominator],
      formula: `(${chosen.map(value => `${value.originalField} = ${value.value}`).join(' + ')}${missing.length ? ' + unknown components' : ''}) / (${denominator.originalField} = ${denominator.value})`,
      warning: exact ? null : fails ? 'The documented lower bound already breaches the rule. Missing amounts were not assumed zero.'
        : passes ? 'The documented upper bound is below the rule; this is not an exact ratio.'
          : `Incomplete numerator or uncertain instrument composition${missing.length ? `: ${missing.join(', ')}` : ''}; no definitive pass or fail.`,
    };
  });
}
