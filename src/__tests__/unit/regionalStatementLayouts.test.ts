import { describe, expect, it } from 'vitest';
import { financialValuesFromPdfPages, pdfEvidenceDocument } from '@/lib/sharia-research/pdfFinancialEvidence';
import { security } from './shariaEvidenceFixtures';

// Synthetic amounts with the column/unit layout observed in Boubyan's official
// 30 June 2026 interim report (PDF pages 3–6); never production financial data.
const now = new Date('2026-09-18T00:00:00Z');
const issuer = { ...security, name: 'Boubyan Bank', canonicalId: 'XKUW:BOUBYAN' };
const statement = `Boubyan Bank
INTERIM CONDENSED CONSOLIDATED STATEMENT OF FINANCIAL POSITION (UNAUDITED)
As at 30 June 2026
Notes 30 June
2026
(Audited)
31 December
2025
30 June
2025
KD’000’s KD’000’s KD’000’s
Total assets 10,000 9,000 8,000
Total liabilities 7,000 6,000 5,000`;
function extract(text = statement) {
  const pages = [{ num: 3, text: 'Boubyan Bank\nREPORT ON REVIEW OF INTERIM\n20 July 2026\nKuwait\n' }, { num: 6, text }];
  const doc = pdfEvidenceDocument(pages, issuer, 'https://www.bankboubyan.com/test.pdf', now.toISOString());
  return financialValuesFromPdfPages(pages, issuer, doc, /Boubyan Bank/i, now);
}

describe('explicit interim column and unit layouts', () => {
  it('reads current-column thousands without confusing prior periods or liabilities with exact debt', () => {
    const values = extract();
    expect(values).toHaveLength(2);
    expect(values.find(v => v.normalizedField === 'total_assets')).toMatchObject({ value: 10_000_000, periodEnd: '2026-06-30', reportedAt: '2026-07-20', currency: 'KWD' });
    expect(values.find(v => v.normalizedField === 'interest_bearing_debt')).toMatchObject({ value: 7_000_000, validation: { bound: 'upper' } });
    expect(values.some(v => v.normalizedField === 'total_income')).toBe(false);
  });
  it('rejects reordered or mismatched dates and ambiguous units', () => {
    expect(extract(statement.replace('(Audited)\n31 December\n2025', '(Audited)\n31 December\n2024'))).toEqual([]);
    expect(extract(statement.replaceAll('KD’000’s', 'KD million'))).toEqual([]);
    expect(extract(statement.replaceAll('30 June', '31 June'))).toEqual([]);
  });
  it('binds a stated year-to-date range to its end rather than January 1', () => {
    const income = `Boubyan Bank
INTERIM CONDENSED CONSOLIDATED STATEMENT OF PROFIT OR LOSS (UNAUDITED)
For the period from 1 January 2026 to 30 June 2026
Three months ended 30 June Six months ended 30 June
2026 2025 2026 2025
KD’000’s KD’000’s KD’000’s KD’000’s
Interest income 10 9 20 18`;
    expect(extract(income)[0]).toMatchObject({ value: 20_000, periodStart: '2026-01-01', periodEnd: '2026-06-30' });
    expect(extract(income.replace('1 January', '1 April'))).toEqual([]);
  });
});
