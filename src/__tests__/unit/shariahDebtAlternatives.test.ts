import { describe, expect, it } from 'vitest';
import { extractFinancialValuesFromCompanyFacts, type SecFacts } from '@/lib/sharia-research/secFinancialExtraction';
import { evidenceFixture } from './shariaEvidenceFixtures';

describe('overlapping SEC debt alternatives', () => {
  function extract(entries: Record<string, number>) {
    const payload: SecFacts = { facts: { 'us-gaap': Object.fromEntries(Object.entries({ Assets: 100, ...entries }).map(([tag, val]) => [tag, {
      units: { USD: [{ val, end: '2026-06-30', filed: '2026-08-01', form: '10-Q', accn: '1-26-1' }] },
    }])) } };
    return extractFinancialValuesFromCompanyFacts(payload, evidenceFixture().document).find(value => value.normalizedField === 'interest_bearing_debt');
  }
  it('does not discard a long-term total when current-only debt is also present', () => {
    const debt = extract({ DebtCurrent: 4, LongTermDebt: 40, ShortTermBorrowings: 2 });
    expect(debt?.value).toBe(42);
    expect(debt?.originalField).toBe('us-gaap:LongTermDebt + us-gaap:ShortTermBorrowings');
    expect(debt?.validation?.bound).toBe('lower');
  });
  it('never adds overlapping alternative totals together', () => {
    expect(extract({ DebtCurrent: 20, LongTermDebtNoncurrent: 30, LongTermDebt: 45, ShortTermBorrowings: 5 })?.value).toBe(50);
  });
  it('still preserves an explicit zero and leaves wholly absent debt absent', () => {
    expect(extract({ DebtCurrent: 0 })?.value).toBe(0);
    expect(extract({})).toBeUndefined();
  });
});
