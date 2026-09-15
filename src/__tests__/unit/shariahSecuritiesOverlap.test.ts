import { describe, expect, it } from 'vitest';
import { extractFinancialValuesFromCompanyFacts, type SecFacts } from '@/lib/sharia-research/secFinancialExtraction';
import { validFinancialValue } from '@/lib/sharia-research/evidenceValidation';
import { calculateFinancialRatios } from '@/lib/sharia-research/financialRatioCalculator';
import { SFM_FTSE_POINT_IN_TIME } from '@/lib/sharia-research/methodologies';
import { evidenceFixture } from './shariaEvidenceFixtures';

function extract(cash?: number) {
  const f = evidenceFixture();
  const payload: SecFacts = { facts: { 'us-gaap': Object.fromEntries(Object.entries({ Assets: 100, DebtSecurities: 30,
    AvailableForSaleSecuritiesDebtSecurities: 20, ...(cash === undefined ? {} : { CashAndCashEquivalentsAtCarryingValue: cash }) })
    .map(([tag, val]) => [tag, { units: { USD: [{ val, end: '2026-06-30', filed: '2026-08-01', accn: '1-26-1', form: '10-Q' }] } }])) } };
  return extractFinancialValuesFromCompanyFacts(payload, f.document);
}
describe('raw securities evidence and non-overlapping bounds', () => {
  it('retains a disclosed 30 instead of fabricating a zero when cash is missing', () => {
    const value = extract().find(item => item.normalizedField === 'interest_bearing_securities')!;
    expect(value.value).toBe(30);
    expect(value.validation?.bound).toBe('unverified');
    expect(validFinancialValue(value, new Date('2026-09-15'))).toBe(false);
  });
  it('deducts known cash conservatively and never sums securities subsets', () => {
    const values = extract(20);
    const value = values.find(item => item.normalizedField === 'interest_bearing_securities')!;
    expect(value.value).toBe(10);
    expect(value.validation?.bound).toBe('lower');
    const ratio = calculateFinancialRatios(values, SFM_FTSE_POINT_IN_TIME, new Date('2026-09-15')).find(item => item.ruleId === 'cash-interest-securities-to-assets')!;
    expect(ratio.value).toBe(0.3);
    expect(ratio.status).not.toBe('fail');
    expect(ratio.status).not.toBe('pass');
  });
  it('cannot later combine unresolved overlapping securities with cash from another source', () => {
    const values = extract();
    const laterCash = extract(20).find(item => item.normalizedField === 'cash_and_equivalents')!;
    const ratio = calculateFinancialRatios([...values, laterCash], SFM_FTSE_POINT_IN_TIME, new Date('2026-09-15')).find(item => item.ruleId === 'cash-interest-securities-to-assets')!;
    expect(ratio.status).toBe('unavailable');
    expect(ratio.value).not.toBe(0.5);
  });
});
