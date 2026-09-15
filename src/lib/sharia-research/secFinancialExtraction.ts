import { randomUUID } from 'node:crypto';
import { currentDay, EVIDENCE_VERSION, isoDay, reportedNumber } from './evidenceValidation';
import type { FinancialValue, NormalizedFinancialField, SourceDocument } from './types';

export type SecFact = { start?: string; end?: string; val?: number; accn?: string; fy?: number; fp?: string; form?: string; filed?: string; frame?: string };
export type SecFacts = { reportingPeriod?: string; expectedAccession?: string; entityName?: string; facts?: Record<string, Record<string, { label?: string; description?: string; units?: Record<string, SecFact[]> }>> };
type Fact = SecFact & { taxonomy: string; tag: string; unit: string; end: string; val: number };
const FORMS = new Set(['10-K', '10-Q', '10-K/A', '10-Q/A', '20-F', '20-F/A', '40-F', '40-F/A', '6-K']);

/** Standard taxonomy only. Custom tags require reviewed mappings, not name guesses. */
function candidates(payload: SecFacts, tags: string[], now: Date): Fact[] {
  return tags.flatMap(qualified => {
    const [taxonomy, tag] = qualified.split(':');
    const units = payload.facts?.[taxonomy]?.[tag]?.units ?? {};
    return Object.entries(units).flatMap(([unit, rows]) => rows.filter(row => (
      /^[A-Z]{3}$/.test(unit) && typeof row.val === 'number' && reportedNumber(row.val) !== null
      && currentDay(row.end, now) && currentDay(row.filed, now) && row.filed! >= row.end!
      && Boolean(row.accn) && FORMS.has(row.form ?? '')
      && (!row.start || (isoDay(row.start) && row.start < row.end!))
    )).map(row => ({ ...row, taxonomy, tag, unit, end: row.end!, val: row.val! })));
  }).sort((a, b) => b.end.localeCompare(a.end) || String(b.filed).localeCompare(String(a.filed))
    || String(a.start ?? '').localeCompare(String(b.start ?? '')) || tags.indexOf(`${a.taxonomy}:${a.tag}`) - tags.indexOf(`${b.taxonomy}:${b.tag}`));
}
const us = (...tags: string[]) => tags.map(tag => `us-gaap:${tag}`);
const ifrs = (...tags: string[]) => tags.map(tag => `ifrs-full:${tag}`);

export function extractFinancialValuesFromCompanyFacts(payload: SecFacts, document: SourceDocument): FinancialValue[] {
  const now = new Date(document.retrievalDate);
  if (!Number.isFinite(now.getTime())) return [];
  const assets = candidates(payload, [...us('Assets'), ...ifrs('Assets')], now).find(fact => !fact.start && fact.val > 0
    && (!(payload.reportingPeriod ?? document.reportingPeriod) || fact.end === (payload.reportingPeriod ?? document.reportingPeriod))
    && (!payload.expectedAccession || fact.accn === payload.expectedAccession));
  if (!assets) return [];
  const values: FinancialValue[] = [];
  const select = (tags: string[], anchor: Fact = assets) => candidates(payload, tags, now).find(fact => (
    fact.end === anchor.end && fact.unit === anchor.unit && fact.accn === anchor.accn
    && (fact.start ?? null) === (anchor.start ?? null)
  ));
  const emit = (field: NormalizedFinancialField, facts: Array<Fact | undefined>, bound: NonNullable<FinancialValue['validation']>['bound'], note: string) => {
    const selected = facts.filter((fact): fact is Fact => Boolean(fact));
    if (!selected.length) return;
    const first = selected[0];
    values.push({
      id: randomUUID(), documentId: document.id, sourceUrl: document.sourceUrl, sourceTitle: document.sourceTitle,
      sourceTier: document.tier, reportingPeriod: first.start ? `${first.start}/${first.end}` : first.end,
      periodEnd: first.end, periodStart: first.start ?? null, filedAt: first.filed!, currency: first.unit,
      value: selected.reduce((sum, fact) => sum + fact.val, 0), unit: first.unit,
      originalField: selected.map(fact => `${fact.taxonomy}:${fact.tag}`).join(' + '), normalizedField: field,
      normalizationFormula: note, accessionNumber: first.accn, form: first.form,
      validation: { version: EVIDENCE_VERSION, bound, note },
    });
  };
  emit('total_assets', [assets], 'exact', 'Consolidated total assets, exact filing instant and currency.');
  const cash = select([...us('CashAndCashEquivalentsAtCarryingValue'), ...ifrs('CashAndCashEquivalents')]);
  emit('cash_and_equivalents', [cash], 'exact', 'Reported cash and cash equivalents, excluding unknown investments.');
  const totalReceivables = select(us('AccountsReceivableNet'));
  const currentReceivables = select(us('AccountsReceivableNetCurrent'));
  const noncurrentReceivables = select(us('AccountsReceivableNetNoncurrent'));
  if (totalReceivables) emit('accounts_receivable', [totalReceivables], 'exact', 'Reported consolidated net accounts receivable.');
  else emit('accounts_receivable', [currentReceivables, noncurrentReceivables], currentReceivables && noncurrentReceivables ? 'exact' : 'lower',
    'Disjoint reported current and non-current net receivables; absent components were not assumed zero.');

  // DebtCurrent includes current maturities and short-term debt. Never add
  // ShortTermBorrowings to it. LongTermDebt alone does not establish total debt.
  const allCurrent = select(us('DebtCurrent'));
  const currentMaturities = select(us('LongTermDebtCurrent', 'LongTermDebtAndFinanceLeaseObligationsCurrent', 'LongTermDebtAndCapitalLeaseObligationsCurrent'));
  const noncurrent = select(us('LongTermDebtNoncurrent', 'LongTermDebtAndFinanceLeaseObligationsNoncurrent', 'LongTermDebtAndCapitalLeaseObligations'));
  const longTotal = select(us('LongTermDebt', 'LongTermDebtAndFinanceLeaseObligations', 'LongTermDebtAndCapitalLeaseObligationsIncludingCurrentMaturities'));
  const short = select(us('ShortTermBorrowings', 'ShortTermDebtCurrent', 'CommercialPaper'));
  // Compare disjoint alternatives rather than dropping a reported long-term
  // total just because a current-only balance also exists. Never add the
  // alternatives to each other: their coverage overlaps.
  const debt = [[allCurrent, noncurrent], [longTotal, short], [currentMaturities, noncurrent, short]]
    .sort((a, b) => b.reduce((sum, fact) => sum + (fact?.val ?? 0), 0) - a.reduce((sum, fact) => sum + (fact?.val ?? 0), 0))[0];
  emit('interest_bearing_debt', debt, 'lower', 'Non-overlapping disclosed debt lower bound. Unreported borrowing/lease categories remain unknown.');
  emit('interest_bearing_debt', [select([...us('Liabilities'), ...ifrs('Liabilities')])], 'upper',
    'All consolidated liabilities conservatively bound interest-bearing debt above. This is not an exact debt amount.');

  // Broad debt-security notes may include cash equivalents. Without reported
  // cash, preserve the raw disclosure but disallow its use as a disjoint input.
  // Another same-accession source could supply cash later; silently treating
  // the overlapping raw value as a lower bound would double count that cash.
  const debtSecurities = select(us('DebtSecurities', 'AvailableForSaleSecuritiesDebtSecurities'));
  const currentSecurities = select(us('AvailableForSaleSecuritiesDebtSecuritiesCurrent', 'HeldToMaturitySecuritiesCurrent'));
  const longSecurities = select(us('AvailableForSaleSecuritiesDebtSecuritiesNoncurrent', 'HeldToMaturitySecuritiesNoncurrent'));
  const securityParts = (debtSecurities ? [debtSecurities] : [currentSecurities, longSecurities]).filter((fact): fact is Fact => Boolean(fact));
  if (securityParts.length) {
    emit('interest_bearing_securities', securityParts, cash ? 'lower' : 'unverified', 'Reported securities; verify overlap with cash equivalents.');
    const item = values[values.length - 1];
    if (cash) item.value = Math.max(0, item.value - cash.val);
    item.normalizationFormula = cash
      ? `max(0, (${item.originalField}) - ${cash.taxonomy}:${cash.tag}) to avoid overlapping cash equivalents`
      : 'Raw reported amount retained; cash-equivalent overlap is unresolved, so this is not a validated ratio input. No missing amount was replaced with zero.';
    item.validation!.note = item.normalizationFormula;
  }

  // Duration fields must have EXACTLY the same start/end, accession and currency.
  // Annual / quarterly / year-to-date values must never be divided across periods.
  const income = candidates(payload, [...us('RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet'), ...ifrs('Revenue')], now)
    .find(fact => fact.start && fact.end === assets.end && fact.accn === assets.accn && fact.unit === assets.unit);
  if (income) emit('total_income', [income], 'exact', 'Consolidated reported revenue for this exact start/end period.');
  // Gross interest is useful evidence even when a bank reports only net revenue.
  // Never replace the missing gross-revenue denominator with net-interest revenue.
  const interestTags = [...us('InterestIncomeOperating', 'InvestmentIncomeInterest', 'InterestIncomeNonoperating'), ...ifrs('InterestIncome')];
  const interest = income ? select(interestTags, income) : candidates(payload, interestTags, now).find(fact => fact.start
    && fact.end === assets.end && fact.accn === assets.accn && fact.unit === assets.unit);
  emit('interest_income', [interest], 'lower', 'Reported gross interest-income lower bound; never net interest, expense or broad non-operating profit.');
  // No standard tag proves that all prohibited operating revenue is zero.
  // A separately sourced, quantified activity/revenue breakdown is required.
  return values;
}
