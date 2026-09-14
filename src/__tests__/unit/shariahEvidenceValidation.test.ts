import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reportedNumber, validFinancialValue } from '@/lib/sharia-research/evidenceValidation';
import { calculateFinancialRatios, isFinancialDataStale } from '@/lib/sharia-research/financialRatioCalculator';
import { SFM_FTSE_POINT_IN_TIME } from '@/lib/sharia-research/methodologies';
import { extractFinancialValuesFromCompanyFacts, type SecFacts } from '@/lib/sharia-research/secFinancialExtraction';
import { classifySfmShariahStock } from '@/lib/market/shariahSelfScreening';
import { evidenceFixture, security } from './shariaEvidenceFixtures';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-14T00:00:00Z')); });
afterEach(() => { vi.useRealTimers(); });

describe('primitive and period invariants', () => {
  it.each([null, undefined, '', ' ', true, false, [], {}, { raw: null }, -1, Infinity, NaN, '33%', '0x00'])('never converts %j to financial zero', value => expect(reportedNumber(value)).toBeNull());
  it.each([0, '0', { raw: 0 }])('preserves explicitly reported zero %j', value => expect(reportedNumber(value)).toBe(0));
  it.each(['2020-01-01', '2099-01-01', '2026-02-30', null])('rejects stale, future and invalid dates: %s', date => expect(isFinancialDataStale(date, 15)).toBe(true));
  it('rejects an invalid filing date or wrong currency unit', () => {
    const f = evidenceFixture().field('total_assets', 100);
    expect(validFinancialValue({ ...f, filedAt: '2026-01-01' })).toBe(false);
    expect(validFinancialValue({ ...f, unit: 'shares' })).toBe(false);
  });
});

describe('rule boundary and incomplete-evidence decisions', () => {
  it.each([5, 5.001, 8])('combines interest plus other prohibited income: %s percent', combined => {
    const f = evidenceFixture(); f.values.find(value => value.normalizedField === 'interest_income')!.value = 4;
    f.values.find(value => value.normalizedField === 'prohibited_revenue')!.value = combined - 4;
    const result = calculateFinancialRatios(f.values, SFM_FTSE_POINT_IN_TIME).at(-1)!;
    expect(result.value).toBeCloseTo(combined / 100); expect(result.status).toBe(combined <= 5 ? 'pass' : 'fail');
  });
  it('negative debt is invalid rather than passing', () => {
    const f = evidenceFixture(); f.values.find(value => value.normalizedField === 'interest_bearing_debt')!.value = -1;
    expect(classifySfmShariahStock({ ...security, symbol: security.ticker }, f.bag).shariahStatus).toBe('needs_review');
  });
  it.each(['currency', 'accessionNumber', 'periodEnd', 'periodStart'] as const)('rejects mixed %s contexts', key => {
    const f = evidenceFixture(); const debt = f.values.find(value => value.normalizedField === 'interest_bearing_debt')!;
    Object.assign(debt, { [key]: key === 'periodEnd' ? '2026-03-31' : key === 'periodStart' ? '2026-01-01' : 'different' });
    expect(calculateFinancialRatios(f.values, SFM_FTSE_POINT_IN_TIME)[0].status).toBe('unavailable');
  });
  it('a lower bound can prove rejection but never a pass', () => {
    const f = evidenceFixture(); const debt = f.values.find(value => value.normalizedField === 'interest_bearing_debt')!;
    debt.validation!.bound = 'lower';
    expect(calculateFinancialRatios(f.values, SFM_FTSE_POINT_IN_TIME)[0].status).toBe('unavailable');
    debt.value = 45;
    expect(calculateFinancialRatios(f.values, SFM_FTSE_POINT_IN_TIME)[0].status).toBe('fail');
  });
  it('old evidence is not revived by a new screening time', () => {
    const f = evidenceFixture(); f.values.forEach(value => { value.periodEnd = '2020-06-30'; value.periodStart = value.periodStart ? '2020-01-01' : null; value.filedAt = '2020-08-01'; });
    expect(classifySfmShariahStock({ ...security, symbol: security.ticker }, f.bag).shariahStatus).toBe('needs_review');
  });
});

function factsFixture() {
  const payload: SecFacts = { facts: { 'us-gaap': {} } };
  const add = (tag: string, value: number, extra: Record<string, unknown> = {}, unit = 'USD') => {
    payload.facts!['us-gaap'][tag] = { units: { [unit]: [{ val: value, end: '2026-06-30', filed: '2026-08-01', accn: '1-26-1', form: '10-Q', ...extra }] } };
  };
  add('Assets', 100); return { payload, add, document: evidenceFixture().document };
}

describe('real extractor with synthetic SEC-shaped filings', () => {
  it('adds short-term borrowing to long-term debt without silently dropping it', () => {
    const f = factsFixture(); f.add('LongTermDebt', 20); f.add('ShortTermBorrowings', 25);
    expect(extractFinancialValuesFromCompanyFacts(f.payload, f.document).find(value => value.normalizedField === 'interest_bearing_debt')?.value).toBe(45);
  });
  it('does not double-count short-term borrowings already in DebtCurrent', () => {
    const f = factsFixture(); f.add('DebtCurrent', 20); f.add('LongTermDebtNoncurrent', 15); f.add('ShortTermBorrowings', 10);
    expect(extractFinancialValuesFromCompanyFacts(f.payload, f.document).find(value => value.normalizedField === 'interest_bearing_debt')?.value).toBe(35);
  });
  it('extracts gross interest for the same income period, never net expense', () => {
    const f = factsFixture(); f.add('Revenues', 100, { start: '2026-01-01' }); f.add('InvestmentIncomeInterest', 4, { start: '2026-01-01' }); f.add('NonoperatingIncomeExpense', -50, { start: '2026-01-01' });
    const values = extractFinancialValuesFromCompanyFacts(f.payload, f.document);
    expect(values.find(value => value.normalizedField === 'interest_income')?.value).toBe(4);
    expect(values.find(value => value.normalizedField === 'prohibited_revenue')).toBeUndefined();
  });
  it('does not replace missing interest with zero, nor net income with gross interest', () => {
    const f = factsFixture(); f.add('Revenues', 100, { start: '2026-01-01' }); f.add('InterestIncomeExpenseNonoperatingNet', 0, { start: '2026-01-01' });
    expect(extractFinancialValuesFromCompanyFacts(f.payload, f.document).some(value => value.normalizedField === 'interest_income')).toBe(false);
  });
  it('does not divide EUR debt or a prior accession by USD current assets', () => {
    const f = factsFixture(); f.add('LongTermDebt', 40, {}, 'EUR'); f.add('ShortTermBorrowings', 40, { accn: 'old' });
    expect(extractFinancialValuesFromCompanyFacts(f.payload, f.document).some(value => value.normalizedField === 'interest_bearing_debt')).toBe(false);
  });
  it('rejects an interest period mismatch', () => {
    const f = factsFixture(); f.add('Revenues', 100, { start: '2026-01-01' }); f.add('InvestmentIncomeInterest', 4, { start: '2026-04-01' });
    expect(extractFinancialValuesFromCompanyFacts(f.payload, f.document).some(value => value.normalizedField === 'interest_income')).toBe(false);
  });
  it('does not label equities and generic investments as interest-bearing securities', () => {
    const f = factsFixture(); f.add('ShortTermInvestments', 40); f.add('LongTermInvestments', 40);
    expect(extractFinancialValuesFromCompanyFacts(f.payload, f.document).some(value => value.normalizedField === 'interest_bearing_securities')).toBe(false);
  });
});
