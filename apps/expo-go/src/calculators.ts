function valid(...values: number[]) { return values.every(value => Number.isFinite(value) && value >= 0); }
export function calculateZakat(eligible: number, nisab: number) { return !valid(eligible, nisab) || nisab <= 0 ? null : eligible >= nisab ? eligible * .025 : 0; }
export function calculateLoan(principal: number, annualRate: number, years: number) {
  if (!valid(principal, annualRate, years) || years <= 0 || years > 100 || annualRate > 100) return null;
  const months = Math.round(years * 12); if (months < 1) return null;
  const rate = annualRate / 1200;
  return rate === 0 ? principal / months : principal * rate / (1 - (1 + rate) ** -months);
}
/** Monthly compounding, with each contribution paid at month end. */
export function calculateCompound(principal: number, annualRate: number, years: number, monthly: number) {
  if (!valid(principal, annualRate, years, monthly) || years > 100 || annualRate > 100) return null;
  const rate = annualRate / 1200, months = Math.round(years * 12);
  const result = rate === 0 ? principal + monthly * months : principal * (1 + rate) ** months + monthly * ((1 + rate) ** months - 1) / rate;
  return Number.isFinite(result) ? result : null;
}
