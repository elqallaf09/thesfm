import { describe, expect, it } from 'vitest';
import { statementSections, statementLayout, statementCurrencyScale } from '@/lib/sharia-research/pdfStatementLayout';
import { financialValuesFromPdfPages, pdfEvidenceDocument, type PdfEvidencePage } from '@/lib/sharia-research/pdfFinancialEvidence';
import { validFinancialValue } from '@/lib/sharia-research/evidenceValidation';
import { security } from './shariaEvidenceFixtures';
const now = new Date('2026-09-16T00:00:00Z');
const issuer = { ...security, name: 'Boubyan Bank', ticker: 'BOUBYAN', canonicalId: 'XKUW:BOUBYAN', country: 'KW', exchange: 'Boursa Kuwait' };
const signature = { num: 9, text: 'Boubyan Bank\nThis interim condensed consolidated financial information was authorised for issue by the Board of Directors on\n7 July 2026.' };
const balance = 'Boubyan Bank\nINTERIM CONDENSED CONSOLIDATED STATEMENT OF FINANCIAL POSITION (UNAUDITED)\nAs at 30 June 2026\n4\nNotes 30 June\n2026\n(Audited)\n31 December\n2025\n30 June\n2025\nKD’000’s KD’000’s KD’000’s\nTotal assets 10,592,712 10,201,278 9,952,562\nTotal liabilities 9,436,340 9,063,393 8,861,599\nIslamic financing to customers 8 8,094,582 7,679,734 7,462,264';
const cashflow = 'Boubyan Bank\nINTERIM CONDENSED CONSOLIDATED STATEMENT OF CASH FLOWS (UNAUDITED)\nFor the period from 1 January 2026 to 30 June 2026\nSix months ended\n30 June\nNotes 2026 2025\nKD’000’s KD’000’s\nCash and cash equivalents at beginning of the period 542,457 685,717\nCash and cash equivalents at end of the period 7 404,805 628,017';
const income = 'Boubyan Bank\nINTERIM CONDENSED CONSOLIDATED STATEMENT OF PROFIT OR LOSS (UNAUDITED)\nFor the period from 1 January 2026 to 30 June 2026\nThree months ended 30 June\nSix months ended 30 June\n2026 2025 2026 2025\nKD’000’s KD’000’s KD’000’s KD’000’s\nOperating income 69,153 65,839 139,248 131,252\nMurabaha and other Islamic financing income 124,745 122,494 246,650 239,120';
function values(input: PdfEvidencePage[]) {
  const pages = [...input, signature];
  const doc = pdfEvidenceDocument(pages, issuer, 'https://www.bankboubyan.com/report.pdf', now.toISOString());
  return financialValuesFromPdfPages(pages, issuer, doc, /Boubyan Bank/i, now);
}
describe('strict multi-statement Gulf PDF layouts', () => {
  it('uses the complete ending date rather than 1 January', () => {
    expect(statementLayout(income, 'income', now)).toMatchObject({ period: '2026-06-30', start: '2026-01-01', columns: 4, index: 2 });
  });
  it('recognizes full dates per balance-sheet column', () => {
    expect(statementLayout(balance, 'balance', now)).toMatchObject({ period: '2026-06-30', columns: 3, index: 0 });
  });
  it.each(['KD’000’s', "KD 000's", 'KD 000s', 'KWD thousands'])('accepts explicitly supported thousand-unit formatting: %s', unit => {
    expect(statementCurrencyScale(unit)).toEqual({ currency: 'KWD', scale: 1000 });
  });
  it('does not turn an unsupported currency into KWD', () => {
    expect(statementCurrencyScale('USD 000s')).toBeNull();
    expect(values([{ num: 6, text: balance.replaceAll('KD’000’s', 'USD 000s') }])).toEqual([]);
  });
  it('extracts assets, liabilities upper bound and the closing cash instant', () => {
    const found = values([{ num: 6, text: balance }, { num: 8, text: cashflow }, { num: 4, text: income }]);
    expect(found).toHaveLength(3);
    expect(found.every(value => validFinancialValue(value, now))).toBe(true);
    expect(found.find(value => value.normalizedField === 'total_assets')).toMatchObject({ value: 10592712000, periodEnd: '2026-06-30', reportedAt: '2026-07-07' });
    expect(found.find(value => value.normalizedField === 'cash_and_equivalents')).toMatchObject({ value: 404805000, periodStart: null, periodEnd: '2026-06-30' });
    expect(found.find(value => value.normalizedField === 'interest_bearing_debt')?.validation?.bound).toBe('upper');
    expect(found.some(value => ['interest_income', 'prohibited_revenue', 'total_income'].includes(value.normalizedField))).toBe(false);
  });
  it('ignores auditor narrative and splits multiple genuine statement titles', () => {
    const combined = 'Boubyan Bank\nWe reviewed the consolidated statement of financial position as at 30 June 2026.\nTotal assets 1 2 3\n' + balance + '\n' + income;
    expect(statementSections(combined).map(section => section.kind)).toEqual(['balance', 'income']);
    expect(values([{ num: 6, text: combined }]).find(value => value.normalizedField === 'total_assets')?.value).toBe(10592712000);
  });
  it('does not treat comprehensive income as the income statement', () => {
    expect(statementSections(income.replace('PROFIT OR LOSS', 'OTHER COMPREHENSIVE INCOME'))).toEqual([]);
  });
  it('rejects future dates, reversed year columns and unsupported YTD starts', () => {
    expect(statementLayout(balance.replaceAll('2026', '2099'), 'balance', now)).toBeNull();
    expect(statementLayout(balance.replace('(Audited)\n31 December\n2025', '(Audited)\n31 December\n2024'), 'balance', now)).toBeNull();
    expect(statementLayout(income.replace('1 January 2026', '1 April 2026'), 'income', now)).toBeNull();
  });
  it('retains an explicit zero but never converts a missing dash to zero', () => {
    expect(values([{ num: 8, text: cashflow.replace('404,805', '0') }])[0]?.value).toBe(0);
    expect(values([{ num: 8, text: cashflow.replace('404,805', '-') }])).toEqual([]);
  });
  it('deduplicates repeated statement text and rejects conflicting same-period values', () => {
    expect(values([{ num: 6, text: balance + '\n' + balance }])).toHaveLength(2);
    expect(() => values([{ num: 6, text: balance }, { num: 7, text: balance.replace('10,592,712', '10,592,713') }])).toThrow('pdf_conflicting_statement_values');
  });
});
