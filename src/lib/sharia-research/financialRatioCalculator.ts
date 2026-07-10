import type { FinancialValue, RatioResult, ShariaMethodology } from './types';

function latestReportingPeriod(values: FinancialValue[]) {
  return values
    .filter(value => value.normalizedField === 'total_assets')
    .map(value => value.periodEnd)
    .sort((a, b) => b.localeCompare(a))[0] ?? null;
}

function preferredValue(values: FinancialValue[], field: FinancialValue['normalizedField'], periodEnd: string | null) {
  if (!periodEnd) return null;
  return values
    .filter(value => value.normalizedField === field && value.periodEnd === periodEnd)
    .sort((a, b) => a.sourceTier - b.sourceTier || String(b.filedAt).localeCompare(String(a.filedAt)))[0] ?? null;
}

export function calculateFinancialRatios(values: FinancialValue[], methodology: ShariaMethodology) {
  const periodEnd = latestReportingPeriod(values);
  return methodology.financialRatioRules.map((rule): RatioResult => {
    const inputs = rule.numeratorFields.map(field => preferredValue(values, field, periodEnd));
    const denominatorInput = preferredValue(values, rule.denominatorField, periodEnd);
    const complete = inputs.every(Boolean) && Boolean(denominatorInput && denominatorInput.value > 0);
    const completeInputs = inputs.filter((value): value is FinancialValue => Boolean(value));
    if (!complete || !denominatorInput) {
      const missing = [
        ...rule.numeratorFields.filter((field, index) => !inputs[index]).map(String),
        ...(!denominatorInput ? [rule.denominatorField] : []),
      ];
      return {
        ruleId: rule.id,
        name: rule.name,
        nameAr: rule.nameAr,
        nameFr: rule.nameFr,
        numerator: null,
        denominator: denominatorInput?.value ?? null,
        value: null,
        threshold: rule.threshold,
        formula: `${rule.numeratorFields.join(' + ')} / ${rule.denominatorField}`,
        status: 'unavailable',
        reportingPeriod: periodEnd,
        currency: denominatorInput?.currency ?? completeInputs[0]?.currency ?? null,
        inputs: [...completeInputs, ...(denominatorInput ? [denominatorInput] : [])],
        warning: `Missing current-period field(s): ${missing.join(', ')}. No zero value was assumed.`,
      };
    }
    const sameCurrency = completeInputs.every(input => input.currency === denominatorInput.currency);
    if (!sameCurrency) {
      return {
        ruleId: rule.id,
        name: rule.name,
        nameAr: rule.nameAr,
        nameFr: rule.nameFr,
        numerator: null,
        denominator: denominatorInput.value,
        value: null,
        threshold: rule.threshold,
        formula: `${rule.numeratorFields.join(' + ')} / ${rule.denominatorField}`,
        status: 'unavailable',
        reportingPeriod: periodEnd,
        currency: null,
        inputs: [...completeInputs, denominatorInput],
        warning: 'Input currencies conflict; automatic currency conversion is not used for filing values.',
      };
    }
    const numerator = completeInputs.reduce((sum, input) => sum + input.value, 0);
    const ratio = numerator / denominatorInput.value;
    return {
      ruleId: rule.id,
      name: rule.name,
      nameAr: rule.nameAr,
      nameFr: rule.nameFr,
      numerator,
      denominator: denominatorInput.value,
      value: ratio,
      threshold: rule.threshold,
      formula: `(${completeInputs.map(input => `${input.originalField} = ${input.value}`).join(' + ')}) / (${denominatorInput.originalField} = ${denominatorInput.value})`,
      status: ratio <= rule.threshold ? 'pass' : 'fail',
      reportingPeriod: periodEnd,
      currency: denominatorInput.currency,
      inputs: [...completeInputs, denominatorInput],
      warning: null,
    };
  });
}

export function isFinancialDataStale(periodEnd: string | null, freshnessMonths: number, now = new Date()) {
  if (!periodEnd) return true;
  const date = new Date(`${periodEnd}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return true;
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - freshnessMonths, now.getUTCDate()));
  return date < cutoff;
}
