import { randomUUID } from 'node:crypto';
import { currentDay, EVIDENCE_VERSION, isoDay, reportedNumber } from './evidenceValidation';
import type { FinancialValue, NormalizedFinancialField, SourceDocument } from './types';

export type SecFact = { start?: string; end?: string; val?: number; accn?: string; fy?: number; fp?: string; form?: string; filed?: string; frame?: string };
export type SecFacts = { entityName?: string; facts?: Record<string, Record<string, { label?: string; description?: string; units?: Record<string, SecFact[]> }>> };
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
  const assets = candidates(payload, [...us('Assets'), ...ifrs('Assets')], now).find(fact => !fact.start && fact.val > 0);
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
  emit('accounts_receivable', [select(us('AccountsReceivableNetCurrent', 'AccountsReceivableNet'))], 'lower', 'Reported net receivables; unreported non-current receivables are not assumed zero.');

  // DebtCurrent includes current maturities and short-term debt. Never add
  // ShortTermBorrowings to it. LongTermDebt alone does not establish total debt.
  const allCurrent = select(us('DebtCurrent', 'LongTermDebtAndCapitalLeaseObligationsCurrent'));
  const currentMaturities = select(us('LongTermDebtCurrent', 'LongTermDebtAndFinanceLeaseObligationsCurrent'));
  const noncurrent = select(us('LongTermDebtNoncurrent', 'LongTermDebtAndFinanceLeaseObligationsNoncurrent'));
  const longTotal = select(us('LongTermDebt', 'LongTermDebtAndFinanceLeaseObligations'));
  const short = select(us('ShortTermBorrowings', 'ShortTermDebtCurrent', 'CommercialPaper'));
  const debt = allCurrent ? [allCurrent, noncurrent]
    : longTotal ? [longTotal, short]
      : [currentMaturities, noncurrent, short];
  emit('interest_bearing_debt', debt, 'lower', 'Non-overlapping disclosed debt lower bound. Unreported borrowing/lease categories remain unknown.');

  // Debt securities are NOT interchangeable with all marketable securities or
  // long-term investments (which may include equities and operating holdings).
  const debtSecurities = select(us('AvailableForSaleSecuritiesDebtSecurities'));
  const currentSecurities = select(us('AvailableForSaleSecuritiesDebtSecuritiesCurrent', 'HeldToMaturitySecuritiesCurrent'));
  const longSecurities = select(us('AvailableForSaleSecuritiesDebtSecuritiesNoncurrent', 'HeldToMaturitySecuritiesNoncurrent'));
  emit('interest_bearing_securities', debtSecurities ? [debtSecurities] : [currentSecurities, longSecurities], 'lower', 'Disclosed debt-security lower bound; unknown trading/held-to-maturity categories are not zero.');

  // Duration fields must have EXACTLY the same start/end, accession and currency.
  // Annual / quarterly / year-to-date values must never be divided across periods.
  const income = candidates(payload, [...us('RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet'), ...ifrs('Revenue')], now)
    .find(fact => fact.start && fact.end === assets.end && fact.accn === assets.accn && fact.unit === assets.unit);
  if (income) {
    emit('total_income', [income], 'exact', 'Consolidated reported revenue for this exact start/end period.');
    const interest = select([...us('InvestmentIncomeInterest', 'InterestIncomeNonoperating'), ...ifrs('InterestIncome')], income);
    emit('interest_income', [interest], 'lower', 'Reported gross interest-income lower bound; never net interest, expense or broad non-operating profit.');
  }
  // No standard tag proves that all prohibited operating revenue is zero.
  // A separately sourced, quantified activity/revenue breakdown is required.
  return values;
}
